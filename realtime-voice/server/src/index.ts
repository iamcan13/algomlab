import 'dotenv/config';
import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import { AudioStorageService, AudioChunkMessage } from './services/audioStorage';
import { WhisperService } from './services/whisperService';
import { TemplateLoader } from './TemplateLoader';
import { LLMMapper } from './LLMMapper';
import { CriteriaManager } from './CriteriaManager';

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.SERVER_PORT || '3001');
const WS_PORT = parseInt(process.env.WS_PORT || '8080');

// Services
const audioStorage = new AudioStorageService();
const whisperService = new WhisperService();
const templateLoader = new TemplateLoader();
const llmMapper = new LLMMapper();
const criteriaManager = new CriteriaManager();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/api/health', async (req, res) => {
  const whisperHealth = await whisperService.healthCheck();
  const whisperStats = whisperService.getStats();
  const llmHealth = await llmMapper.healthCheck();
  const llmStats = llmMapper.getStats();
  
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    whisper: {
      healthy: whisperHealth,
      ...whisperStats
    },
    llm: {
      healthy: llmHealth,
      ...llmStats
    }
  });
});

// Session stats endpoint
app.get('/api/sessions/:sessionId/stats', (req, res) => {
  const { sessionId } = req.params;
  const stats = audioStorage.getSessionStats(sessionId);
  res.json(stats);
});

// Template endpoints
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await templateLoader.getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('템플릿 목록 조회 실패:', error);
    res.status(500).json({ error: '템플릿 목록을 불러올 수 없습니다' });
  }
});

app.get('/api/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateLoader.loadTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('템플릿 로드 실패:', error);
    res.status(500).json({ error: '템플릿을 불러올 수 없습니다' });
  }
});

app.get('/api/templates/default', async (req, res) => {
  try {
    const template = await templateLoader.getDefaultTemplate();
    
    if (!template) {
      return res.status(404).json({ error: '기본 템플릿을 찾을 수 없습니다' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('기본 템플릿 로드 실패:', error);
    res.status(500).json({ error: '기본 템플릿을 불러올 수 없습니다' });
  }
});

// Criteria management endpoints
app.post('/api/criteria/template', async (req, res) => {
  try {
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: '템플릿 ID가 필요합니다' });
    }
    
    const template = await templateLoader.loadTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다' });
    }
    
    criteriaManager.setTemplate(template);
    res.json({ message: '템플릿 설정 완료', template });
  } catch (error) {
    console.error('템플릿 설정 실패:', error);
    res.status(500).json({ error: '템플릿 설정에 실패했습니다' });
  }
});

app.get('/api/criteria/status', (req, res) => {
  try {
    const template = criteriaManager.getTemplate();
    const stats = criteriaManager.getStats();
    
    res.json({
      template,
      stats,
      weakCriteria: criteriaManager.getWeakCriteria(),
      progress: criteriaManager.getProgress()
    });
  } catch (error) {
    console.error('기준 상태 조회 실패:', error);
    res.status(500).json({ error: '기준 상태를 조회할 수 없습니다' });
  }
});

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('클라이언트 연결됨');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`메시지 수신: ${message.type}`);
      
      if (message.type === 'audio_chunk') {
        // 오디오 청크 처리
        const audioMessage = message as AudioChunkMessage;
        console.log(`오디오 청크: 세션=${audioMessage.sessionId}, 시퀀스=${audioMessage.sequence}, 크기=${audioMessage.audioData.length}`);
        
        // 파일 저장
        const ackMessage = await audioStorage.saveAudioChunk(audioMessage);
        
        // 저장 성공 시 STT 처리
        if (ackMessage.saved && ackMessage.filePath) {
          console.log(`STT 처리 시작: ${ackMessage.filePath}`);
          
          // 비동기로 STT 처리 (응답 속도를 위해 백그라운드에서 실행)
          whisperService.transcribeAudioFile(
            ackMessage.filePath, 
            audioMessage.sessionId, 
            audioMessage.sequence
          ).then(transcriptionResult => {
            // STT 결과를 클라이언트에 전송
            if (transcriptionResult.success && transcriptionResult.transcription) {
              const transcript = transcriptionResult.transcription.text;
              const sttMessage = {
                type: 'transcription_result',
                sessionId: audioMessage.sessionId,
                sequence: audioMessage.sequence,
                text: transcript,
                duration: transcriptionResult.transcription.duration,
                timestamp: Date.now()
              };
              
              console.log(`STT 결과 전송: "${transcript}"`);
              ws.send(JSON.stringify(sttMessage));

              // LLM 분석 수행 (백그라운드)
              const currentTemplate = criteriaManager.getTemplate();
              if (currentTemplate && transcript.trim().length > 0) {
                criteriaManager.addToConversationHistory(transcript);
                
                llmMapper.processTranscript(
                  transcript,
                  currentTemplate,
                  criteriaManager.getConversationHistory()
                ).then(llmResponse => {
                  if (llmResponse) {
                    // 기준 업데이트 적용
                    criteriaManager.applyCriteriaUpdates(llmResponse.criteria_updates);
                    
                    // 기준 업데이트를 클라이언트에 전송
                    if (llmResponse.criteria_updates.length > 0) {
                      ws.send(JSON.stringify({
                        type: 'criteria_update',
                        updates: llmResponse.criteria_updates,
                        progress: criteriaManager.getProgress(),
                        timestamp: Date.now()
                      }));
                    }
                    
                    // 질문 제안을 클라이언트에 전송
                    if (llmResponse.next_questions.length > 0) {
                      ws.send(JSON.stringify({
                        type: 'questions',
                        questions: llmResponse.next_questions,
                        timestamp: Date.now()
                      }));
                    }
                  }
                }).catch(error => {
                  console.error('LLM 분석 중 오류:', error);
                });
              }
            } else {
              console.error(`STT 실패: ${transcriptionResult.error}`);
              ws.send(JSON.stringify({
                type: 'transcription_error',
                sessionId: audioMessage.sessionId,
                sequence: audioMessage.sequence,
                error: transcriptionResult.error,
                timestamp: Date.now()
              }));
            }
          }).catch(error => {
            console.error('STT 처리 중 예외 발생:', error);
          });
        }
        
        // 청크 저장 응답 전송
        ws.send(JSON.stringify(ackMessage));
        
        // 세션 통계 로깅
        const stats = audioStorage.getSessionStats(audioMessage.sessionId);
        console.log(`세션 통계: ${JSON.stringify(stats)}`);
        
      } else if (message.type === 'session_stats') {
        // 세션 통계 요청
        const stats = audioStorage.getSessionStats(message.sessionId);
        ws.send(JSON.stringify({
          type: 'session_stats_response',
          ...stats
        }));
        
      } else {
        // 기타 메시지 에코
        console.log('기타 메시지:', message);
        ws.send(JSON.stringify({
          type: 'echo',
          original: message,
          timestamp: Date.now()
        }));
      }
      
    } catch (error) {
      console.error('메시지 처리 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '메시지 처리 중 오류 발생',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('클라이언트 연결 해제됨');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 오류:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`WebSocket Server running on port ${WS_PORT}`);
});