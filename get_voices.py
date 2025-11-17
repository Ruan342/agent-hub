#!/usr/bin/env python3
import os
from elevenlabs import ElevenLabs

# Load environment variables
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')

if not ELEVENLABS_API_KEY:
    print("No ElevenLabs API key found")
    exit(1)

try:
    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    voices = client.voices.get_all()
    
    print("Available ElevenLabs voices:")
    for voice in voices.voices[:5]:  # Show first 5 voices
        print(f"ID: {voice.voice_id}, Name: {voice.name}")
        
    if voices.voices:
        print(f"\nUsing voice ID for testing: {voices.voices[0].voice_id}")
        
except Exception as e:
    print(f"Error getting voices: {e}")