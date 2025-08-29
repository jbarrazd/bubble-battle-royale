#!/usr/bin/env python3
"""
Script to remove white background from an image and make it transparent
"""

from PIL import Image
import numpy as np

def remove_white_background(input_path, output_path, threshold=240):
    """
    Remove white background from an image
    
    Args:
        input_path: Path to input image
        output_path: Path to output image with transparency
        threshold: RGB values above this are considered white (0-255)
    """
    # Open the image
    img = Image.open(input_path)
    
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Convert to numpy array
    data = np.array(img)
    
    # Find white pixels (where all RGB values are above threshold)
    # We check if R, G, and B are all above threshold
    white_pixels = (data[:, :, 0] > threshold) & \
                   (data[:, :, 1] > threshold) & \
                   (data[:, :, 2] > threshold)
    
    # Set alpha channel to 0 (transparent) for white pixels
    data[white_pixels, 3] = 0
    
    # Create new image from modified data
    new_img = Image.fromarray(data, 'RGBA')
    
    # Save with transparency
    new_img.save(output_path, 'PNG')
    print(f"Saved transparent image to: {output_path}")

if __name__ == "__main__":
    # Process cannon2.png
    input_file = "public/assets/sprites/cannon2.png"
    output_file = "public/assets/sprites/cannon2_transparent.png"
    
    try:
        remove_white_background(input_file, output_file, threshold=240)
        print("Successfully removed white background!")
    except Exception as e:
        print(f"Error: {e}")