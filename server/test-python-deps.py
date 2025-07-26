#!/usr/bin/env python3
"""
Test script to verify Python dependencies for head pose detection
"""

import sys
import importlib

def test_import(module_name, package_name=None):
    """Test if a module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {module_name} - OK")
        return True
    except ImportError as e:
        print(f"❌ {module_name} - FAILED: {e}")
        if package_name:
            print(f"   Install with: pip install {package_name}")
        return False

def test_opencv():
    """Test OpenCV functionality"""
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
        
        # Test basic OpenCV functionality
        import numpy as np
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        print("✅ OpenCV basic functionality - OK")
        return True
    except Exception as e:
        print(f"❌ OpenCV test failed: {e}")
        return False

def test_mediapipe():
    """Test MediaPipe functionality"""
    try:
        import mediapipe as mp
        print(f"✅ MediaPipe version: {mp.__version__}")
        
        # Test MediaPipe face mesh
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5)
        print("✅ MediaPipe face mesh - OK")
        return True
    except Exception as e:
        print(f"❌ MediaPipe test failed: {e}")
        return False

def test_fastapi():
    """Test FastAPI functionality"""
    try:
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        from pydantic import BaseModel
        import uvicorn
        
        app = FastAPI()
        print("✅ FastAPI - OK")
        print("✅ CORS middleware - OK")
        print("✅ Pydantic - OK")
        print("✅ Uvicorn - OK")
        return True
    except Exception as e:
        print(f"❌ FastAPI test failed: {e}")
        return False

def main():
    print("🔍 Testing Python dependencies for head pose detection...")
    print("=" * 60)
    
    # Test Python version
    print(f"🐍 Python version: {sys.version}")
    
    # Test required modules
    print("\n📦 Testing required modules:")
    modules = [
        ("cv2", "opencv-python"),
        ("numpy", "numpy"),
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn[standard]"),
        ("pydantic", "pydantic")
    ]
    
    all_ok = True
    for module, package in modules:
        if not test_import(module, package):
            all_ok = False
    
    # Test functionality
    print("\n🔧 Testing functionality:")
    test_opencv()
    test_fastapi()
    
    # Test head pose detector import
    print("\n🤖 Testing head pose detector:")
    try:
        sys.path.append('./server')
        from simple_head_pose_detector import start_head_pose_server, process_frame_for_head_pose
        print("✅ Simple head pose detector module - OK")
        print("✅ start_head_pose_server function - OK")
        print("✅ process_frame_for_head_pose function - OK")
    except Exception as e:
        print(f"❌ Simple head pose detector test failed: {e}")
        all_ok = False
    
    print("\n" + "=" * 60)
    if all_ok:
        print("🎉 All tests passed! Head pose detector should work.")
    else:
        print("❌ Some tests failed. Please install missing dependencies.")
        print("\nTo install all dependencies, run:")
        print("pip install -r requirements.txt")
    
    return all_ok

if __name__ == "__main__":
    main() 