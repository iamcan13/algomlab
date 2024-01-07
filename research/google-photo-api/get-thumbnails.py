from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import json

# Scopes required to access Google Photos
SCOPES = ['https://www.googleapis.com/auth/photoslibrary.readonly']
PAGE_SIZE = 10
MAX_IMAGE_SIZE = 100

def authenticate_google_photos():
    flow = InstalledAppFlow.from_client_secrets_file('.client_secret.json', SCOPES)
    credentials = flow.run_local_server(port=9090)
    service = build('photoslibrary', 'v1', credentials=credentials, static_discovery=False)
    #service = build('youtube', 'v3', credentials=credentials)
    return service

def search_photos(service, **kwargs):
    # Define the search criteria
    search_body = {
        "filters": {},
        'pageSize': PAGE_SIZE,
    }
    for kw, config in kwargs.items():
        search_body['filters'][kw] = config

    items = []
    page_token = None

    while len(items) < MAX_IMAGE_SIZE:
        if page_token:
            search_body['pageToken'] = page_token

        # Execute the search
        results = service.mediaItems().search(body=search_body).execute()
        new_items = results.get('mediaItems', [])
        items.extend(new_items)

        # Check for nextPageToken in the response
        page_token = results.get('nextPageToken', None)
        if not page_token:
            break

    return items

def get_date(year, month, day):
    return { 'year': year, 'month': month, 'day': day }

def main():
    service = authenticate_google_photos()
    query = "LANDSCAPES"  # Example category
    photos = search_photos(
        service,
        dateFilter={
            'ranges': [
                { 'startDate': get_date(2023,1,1), 'endDate': get_date(2023,1,5) },
            ]
        }
    )
    for photo in photos:
        print(json.dumps(photo))

if __name__ == '__main__':
    main()

