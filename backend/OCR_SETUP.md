# OCR Setup for Image-Based PDFs

If you need to process image-based PDFs (scanned resumes), follow these steps:

## 1. Install Python Libraries

```bash
cd backend
source venv/bin/activate
pip3 install pdf2image pytesseract pillow
```

## 2. Install Tesseract OCR

### macOS
```bash
brew install tesseract
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

### Windows
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

## 3. Verify Installation

```bash
tesseract --version
```

You should see something like:
```
tesseract 5.x.x
```

## 4. Test OCR

Upload an image-based PDF resume. The system will:
1. Try regular text extraction first
2. If no text found, automatically use OCR
3. Show progress in terminal: "Running OCR on X pages..."

## Notes

- OCR is slower than regular text extraction (5-10 seconds per page)
- Works best with clear, high-resolution scans
- Supports English language by default
- For other languages, install additional Tesseract language packs

## Troubleshooting

**Error: "OCR libraries not installed"**
- Run: `pip install pdf2image pytesseract pillow`

**Error: "tesseract is not installed"**
- Install Tesseract OCR using instructions above

**Error: "Unable to get page count"**
- Install poppler-utils:
  - macOS: `brew install poppler`
  - Linux: `sudo apt-get install poppler-utils`
  - Windows: Download from http://blog.alivate.com.au/poppler-windows/
