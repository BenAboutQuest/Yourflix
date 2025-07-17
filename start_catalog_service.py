#!/usr/bin/env python3
"""
Catalog Lookup Service Launcher
"""
import subprocess
import sys
import os

def main():
    # Change to the project directory
    os.chdir('/home/runner/workspace')
    
    # Run the Flask service
    subprocess.run([sys.executable, 'catalog_lookup_service.py'])

if __name__ == "__main__":
    main()