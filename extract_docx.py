import zipfile
import xml.etree.ElementTree as ET
import sys
import os

# Set stdout to UTF-8 to handle Korean characters correctly in the console
sys.stdout.reconfigure(encoding='utf-8')

def extract_text_from_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            namespaces = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            }
            
            text_parts = []
            for node in tree.iter():
                if node.tag.endswith('}t'):
                    if node.text:
                        text_parts.append(node.text)
                elif node.tag.endswith('}p'):
                    text_parts.append('\n')
                elif node.tag.endswith('}tab'):
                    text_parts.append('\t')
            
            return "".join(text_parts)
    except Exception as e:
        return f"Error reading {file_path}: {str(e)}"

# Hardcoded paths to ensure no globbing/encoding issues with filenames passed as args
files = [
    r"C:\Users\scspr\WorkSpace\자기소개서\최종.docx",
    r"C:\Users\scspr\WorkSpace\자기소개서\SCS프로_제출용_자기소개서.docx",
    r"C:\Users\scspr\WorkSpace\자기소개서\Job Application-toyota_ver.docx"
]

for f in files:
    print(f"=== FILE_START: {os.path.basename(f)} ===")
    if os.path.exists(f):
        content = extract_text_from_docx(f)
        print(content)
    else:
        print("File not found.")
    print(f"=== FILE_END: {os.path.basename(f)} ===\n")