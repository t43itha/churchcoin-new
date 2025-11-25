from PIL import Image
import os

def invert_image(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # item is (r, g, b, a)
            # If it's transparent, keep it transparent
            if item[3] == 0:
                new_data.append(item)
            else:
                # Invert colors: 255 - value
                # But if it's white (255, 255, 255), we want it black (0, 0, 0)
                # If it's already dark, this will make it light, which might be bad if it was dark.
                # Let's check if it's mostly light.
                new_data.append((255 - item[0], 255 - item[1], 255 - item[2], item[3]))
        
        img.putdata(new_data)
        img.save(image_path)
        print(f"Successfully inverted colors for {image_path}")
        
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    invert_image("public/tithe_logo.png")
