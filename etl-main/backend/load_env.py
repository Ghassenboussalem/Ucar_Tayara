#!/usr/bin/env python3
"""
Environment loader for UCAR ETL Platform
Loads environment variables from .env file
"""

import os
from pathlib import Path


def load_env_file(env_path: str | Path = None) -> bool:
    """
    Load environment variables from .env file
    
    Args:
        env_path: Path to .env file. If None, looks for .env in project root
        
    Returns:
        bool: True if .env file was loaded successfully
    """
    if env_path is None:
        # Look for .env in project root (parent of backend directory)
        current_dir = Path(__file__).parent
        project_root = current_dir.parent
        env_path = project_root / ".env"
    
    env_path = Path(env_path)
    
    if not env_path.exists():
        print(f"Warning: .env file not found at {env_path}")
        return False
    
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Parse KEY=VALUE format
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    # Remove quotes if present
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    elif value.startswith("'") and value.endswith("'"):
                        value = value[1:-1]
                    
                    # Set environment variable if not already set
                    if key not in os.environ:
                        os.environ[key] = value
                else:
                    print(f"Warning: Invalid line format at {env_path}:{line_num}: {line}")
        
        print(f"✅ Environment variables loaded from {env_path}")
        return True
        
    except Exception as e:
        print(f"Error loading .env file: {e}")
        return False


def print_env_status():
    """Print status of important environment variables"""
    important_vars = [
        "APP_NAME",
        "APP_VERSION", 
        "JWT_SECRET_KEY",
        "GROQ_API_KEY",
        "ENVIRONMENT",
        "DEBUG"
    ]
    
    print("\n🔧 Environment Variables Status:")
    print("-" * 40)
    
    for var in important_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if "KEY" in var or "SECRET" in var:
                display_value = f"{value[:8]}..." if len(value) > 8 else "***"
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: Not set")
    
    print("-" * 40)


if __name__ == "__main__":
    # Load environment variables
    success = load_env_file()
    
    # Print status
    print_env_status()
    
    if not success:
        print("\n⚠️  Consider creating a .env file from .env.example")
        print("   cp .env.example .env")
        print("   # Then edit .env with your actual values")