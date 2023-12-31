from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Scopes required to access Google Photos
SCOPES = ['https://www.googleapis.com/auth/photoslibrary.readonly']

def authenticate_google_photos():
    flow = InstalledAppFlow.from_client_secrets_file('.client_secret.json', SCOPES)
    credentials = flow.run_local_server(port=9090)
    service = build('photoslibrary', 'v1', credentials=credentials, static_discovery=False)
    #service = build('youtube', 'v3', credentials=credentials)
    return service

def search_photos(service, query):
    # Define the search criteria
    search_body = {
        "filters": {
            "contentFilter": {
                "includedContentCategories": [query]
            }
        }
    }

    # Execute the search
    results = service.mediaItems().search(body=search_body).execute()
    items = results.get('mediaItems', [])
    return items

def main():
    service = authenticate_google_photos()
    query = "LANDSCAPES"  # Example category
    photos = search_photos(service, query)
    for photo in photos:
        print(photo['baseUrl'])  # Prints the URL of each photo

if __name__ == '__main__':
    main()

