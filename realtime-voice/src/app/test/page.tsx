'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  time: string;
  content: string;
  type: 'sent' | 'received' | 'info' | 'error';
}

export default function WebSocketTestPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (content: string, type: Message['type'] = 'info') => {
    const newMessage: Message = {
      time: new Date().toLocaleTimeString('ko-KR'),
      content,
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const connect = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      addMessage('이미 연결되어 있습니다!', 'info');
      return;
    }

    const websocket = new WebSocket('ws://localhost:8080');
    
    websocket.onopen = () => {
      setIsConnected(true);
      addMessage('✅ WebSocket 서버에 연결되었습니다', 'info');
    };
    
    websocket.onmessage = (event) => {
      addMessage(`📨 수신: ${event.data}`, 'received');
    };
    
    websocket.onclose = () => {
      setIsConnected(false);
      addMessage('❌ WebSocket 연결이 종료되었습니다', 'info');
      setWs(null);
    };
    
    websocket.onerror = () => {
      setIsConnected(false);
      addMessage('🚨 연결 오류가 발생했습니다', 'error');
    };

    setWs(websocket);
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
    }
  };

  const sendMessage = () => {
    const message = inputValue.trim();
    if (!message) return;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      addMessage(`📤 송신: ${message}`, 'sent');
      setInputValue('');
    } else {
      addMessage('🚨 연결되지 않았습니다! 먼저 연결 버튼을 클릭하세요.', 'error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const getMessageColor = (type: Message['type']) => {
    switch (type) {
      case 'sent': return 'text-blue-600';
      case 'received': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">WebSocket 에코 테스트</h1>
      
      {/* Status */}
      <div className="mb-4 p-3 rounded-lg bg-gray-100">
        <span className="font-semibold">상태: </span>
        <span className={isConnected ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
          {isConnected ? '연결됨' : '연결 끊김'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          className="flex-1 min-w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          전송
        </button>
        <button
          onClick={connect}
          disabled={isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          연결
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          연결 해제
        </button>
      </div>

      {/* Messages */}
      <div className="border border-gray-300 rounded-lg h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            연결 버튼을 클릭하여 WebSocket 연결 테스트를 시작하세요
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className="mb-2">
            <span className="text-gray-500 text-sm font-mono">
              [{message.time}]
            </span>
            <span className={`ml-2 ${getMessageColor(message.type)}`}>
              {message.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">테스트 방법:</h3>
        <ol className="list-decimal list-inside text-blue-700 space-y-1">
          <li>연결 버튼을 클릭하여 WebSocket 서버에 연결</li>
          <li>메시지를 입력하고 전송 버튼 클릭 (또는 Enter키)</li>
          <li>서버에서 "Echo: 메시지" 형태로 응답이 돌아오는지 확인</li>
          <li>서버 로그에서도 메시지 수신 확인 가능</li>
        </ol>
      </div>

      {/* Server Info */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">서버 정보:</h3>
        <ul className="list-disc list-inside text-yellow-700 space-y-1">
          <li>WebSocket Server: ws://localhost:8080</li>
          <li>HTTP API: http://localhost:3001</li>
          <li>서버 로그: <code className="bg-yellow-100 px-1 rounded">tail -f server/.server.log</code></li>
        </ul>
      </div>
    </div>
  );
}