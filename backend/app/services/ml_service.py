import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageFile
from pathlib import Path
import os
import logging
import uuid
import numpy as np
import cv2

# Grad-CAM imports
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

from app.core.config import settings

# Allow PIL to load truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

logger = logging.getLogger(__name__)

class DRModelService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DRModelService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the model and transforms."""
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"ML Service using device: {self.device}")
        
        # Determine model path
        self.model_path = Path(__file__).parent.parent / "ml" / "best_dr_model.pth"
        
        # Heatmaps directory
        # Mount point /uploads maps to settings.UPLOAD_DIR
        self.heatmap_dir = Path(settings.UPLOAD_DIR) / "heatmaps"
        self.heatmap_dir.mkdir(parents=True, exist_ok=True)
        
        # Determine model path
        # Assuming model is placed in backend/app/ml/best_dr_model.pth
        self.model_path = Path(__file__).parent.parent / "ml" / "best_dr_model.pth"
        
        # Class mapping (assuming DDR/standard 6-class format, e.g., 0-4 DR stages + 5 ungradable/other)
        self.class_names = {
            0: "No DR",
            1: "Mild NPDR",
            2: "Moderate NPDR",
            3: "Severe NPDR",
            4: "Proliferative DR",
            5: "Ungradable / Other"
        }
        
        # Load Model
        self.model = self._load_model()
        
        # Validation/Test Transforms exactly as in Untitled.ipynb
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def _load_model(self):
        """Loads the ResNet50 model and weights."""
        if not self.model_path.exists():
            logger.warning(f"Model file not found at {self.model_path}. Returning dummy model.")
            return None
        
        try:
            # Initialize ResNet50
            # We don't need weights=models.ResNet50_Weights.IMAGENET1K_V1 here as we load our own weights
            model = models.resnet50()
            
            # Modify final layer for 6 classes
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, 6)
            
            # Load weights
            model.load_state_dict(torch.load(str(self.model_path), map_location=self.device))
            model = model.to(self.device)
            model.eval()  # Set to evaluation mode
            
            logger.info("PyTorch ResNet50 model loaded successfully.")
            return model
            
        except Exception as e:
            logger.error(f"Error loading PyTorch model: {e}")
            return None

    def predict(self, image_path: str):
        """Run inference on the provided image and generate Grad-CAM heatmap."""
        if self.model is None:
            # Fallback placeholder if model didn't load
            return "Unknown (Model missing)", 0.0, "Model file not found or failed to load.", None

        try:
            # Open image
            image = Image.open(image_path).convert('RGB')
            
            # Apply transforms and add batch dimension
            input_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                confidence, predicted_class = torch.max(probabilities, 0)
                
            pred_idx = predicted_class.item()
            conf_val = confidence.item()
            
            dr_stage = self.class_names.get(pred_idx, f"Class {pred_idx}")
            details = f"Model predicted class {pred_idx} with {conf_val*100:.2f}% confidence."
            
            # --- Grad-CAM Heatmap Generation ---
            heatmap_filename = None
            try:
                # Target the last convolutional layer in ResNet50
                target_layers = [self.model.layer4[-1]]
                
                # We need to enable gradients for Grad-CAM
                # (The context manager `with torch.no_grad():` is closed above)
                with GradCAM(model=self.model, target_layers=target_layers) as cam:
                    targets = [ClassifierOutputTarget(pred_idx)]
                    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]
                    
                    # Read original image for overlay
                    rgb_img = cv2.imread(image_path, 1)[:, :, ::-1]
                    rgb_img = np.float32(rgb_img) / 255
                    rgb_img = cv2.resize(rgb_img, (224, 224))
                    
                    # Overlay CAM on image
                    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
                    
                    # Save heatmap
                    heatmap_filename = f"heatmap_{uuid.uuid4().hex}.jpg"
                    heatmap_path = self.heatmap_dir / heatmap_filename
                    
                    # Convert RGB back to BGR for OpenCV saving
                    cv2.imwrite(str(heatmap_path), visualization[:, :, ::-1])
            except Exception as cam_err:
                logger.error(f"Error generating Grad-CAM: {cam_err}")
                with open(str(self.heatmap_dir / "gradcam_error.txt"), "w") as f:
                    import traceback
                    f.write(traceback.format_exc())
            
            return dr_stage, float(conf_val), details, heatmap_filename
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return "Error", 0.0, f"Failed to run prediction: {str(e)}", None

# Global instance
ml_service = DRModelService()
