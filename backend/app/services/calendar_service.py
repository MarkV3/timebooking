import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from app.core.config import settings

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """Service for Google Calendar integration"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    def _get_calendar_service(self, token_data: Dict[str, Any]):
        """Build Google Calendar service from token data"""
        try:
            creds = Credentials.from_authorized_user_info(
                token_data, 
                scopes=self.SCOPES
            )
            
            # Refresh token if expired
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
            
            service = build('calendar', 'v3', credentials=creds)
            return service, creds
        except Exception as e:
            logger.error(f"Failed to create calendar service: {e}")
            raise
    
    def get_authorization_url(self) -> str:
        """Get Google Calendar authorization URL"""
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.SCOPES
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return authorization_url
    
    def exchange_code_for_token(self, auth_code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.SCOPES
        )
        flow.redirect_uri = self.redirect_uri
        
        flow.fetch_token(code=auth_code)
        
        return {
            'token': flow.credentials.token,
            'refresh_token': flow.credentials.refresh_token,
            'token_uri': flow.credentials.token_uri,
            'client_id': flow.credentials.client_id,
            'client_secret': flow.credentials.client_secret,
            'scopes': flow.credentials.scopes
        }
    
    async def create_calendar_event(
        self,
        token_data: Dict[str, Any],
        event_details: Dict[str, Any]
    ) -> Optional[str]:
        """
        Create a calendar event
        
        Args:
            token_data: Google Calendar OAuth token data
            event_details: Event details including start_time, end_time, summary, description
            
        Returns:
            Event ID if successful, None otherwise
        """
        try:
            service, updated_creds = self._get_calendar_service(token_data)
            
            # Convert datetime objects to RFC3339 format
            start_time = event_details['start_time']
            end_time = event_details['end_time']
            
            if isinstance(start_time, datetime):
                start_time = start_time.isoformat()
            if isinstance(end_time, datetime):
                end_time = end_time.isoformat()
            
            event_body = {
                'summary': event_details.get('summary', 'Appointment'),
                'description': event_details.get('description', ''),
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'UTC',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                        {'method': 'popup', 'minutes': 30},       # 30 minutes before
                    ],
                },
            }
            
            # Add location if provided
            if 'location' in event_details:
                event_body['location'] = event_details['location']
            
            # Add attendees if provided
            if 'attendees' in event_details:
                event_body['attendees'] = [
                    {'email': email} for email in event_details['attendees']
                ]
            
            event = service.events().insert(
                calendarId='primary',
                body=event_body
            ).execute()
            
            logger.info(f"Calendar event created: {event.get('id')}")
            return event.get('id')
            
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            return None
    
    async def update_calendar_event(
        self,
        token_data: Dict[str, Any],
        event_id: str,
        event_details: Dict[str, Any]
    ) -> bool:
        """Update an existing calendar event"""
        try:
            service, _ = self._get_calendar_service(token_data)
            
            # Get the existing event
            event = service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update event details
            if 'summary' in event_details:
                event['summary'] = event_details['summary']
            if 'description' in event_details:
                event['description'] = event_details['description']
            if 'start_time' in event_details:
                start_time = event_details['start_time']
                if isinstance(start_time, datetime):
                    start_time = start_time.isoformat()
                event['start']['dateTime'] = start_time
            if 'end_time' in event_details:
                end_time = event_details['end_time']
                if isinstance(end_time, datetime):
                    end_time = end_time.isoformat()
                event['end']['dateTime'] = end_time
            if 'location' in event_details:
                event['location'] = event_details['location']
            
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Calendar event updated: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update calendar event {event_id}: {e}")
            return False
    
    async def delete_calendar_event(
        self,
        token_data: Dict[str, Any],
        event_id: str
    ) -> bool:
        """Delete a calendar event"""
        try:
            service, _ = self._get_calendar_service(token_data)
            
            service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            logger.info(f"Calendar event deleted: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete calendar event {event_id}: {e}")
            return False
    
    async def list_calendar_events(
        self,
        token_data: Dict[str, Any],
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """List calendar events"""
        try:
            service, _ = self._get_calendar_service(token_data)
            
            params = {
                'calendarId': 'primary',
                'maxResults': max_results,
                'singleEvents': True,
                'orderBy': 'startTime'
            }
            
            if time_min:
                params['timeMin'] = time_min.isoformat() + 'Z'
            if time_max:
                params['timeMax'] = time_max.isoformat() + 'Z'
            
            events_result = service.events().list(**params).execute()
            events = events_result.get('items', [])
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to list calendar events: {e}")
            return []
    
    def validate_token(self, token_data: Dict[str, Any]) -> bool:
        """Validate if the Google Calendar token is still valid"""
        try:
            service, _ = self._get_calendar_service(token_data)
            # Try to make a simple API call
            service.calendars().get(calendarId='primary').execute()
            return True
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return False

# Singleton instance
calendar_service = GoogleCalendarService()
