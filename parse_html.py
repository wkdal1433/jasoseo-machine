
import json
import re
import sys
import os # Import os for file existence check
import base64 # Import base64 for encoding
from bs4 import BeautifulSoup # Import BeautifulSoup

def parse_self_introduction_form(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    questions_data = []
    
    # Find all potential question elements (divs with bold style)
    question_divs = soup.find_all('div', style=re.compile(r'font-weight:\s*bold'))
    
    for order, q_div in enumerate(question_divs):
        question_text_raw = q_div.get_text(strip=True)
        
        # Remove character limit instructions from the question text
        # Examples: (최소 500자 ~ 최대 1000자), (최대 1000자), (500자 이내)
        question_text = re.sub(r'\(최소\s*\d+자\s*~?\s*최대\s*\d+자\)|'
                               r'\(최대\s*\d+자\)|'
                               r'\(\d+자\s*이내\)', '', question_text_raw).strip()
        
        char_limit = None
        
        # Look for the next sibling div that contains the textarea and v-counter
        # The structure is usually <question_div> <div with textarea>
        current_element = q_div
        textarea_found = False
        while current_element and not textarea_found:
            current_element = current_element.find_next_sibling()
            if current_element and current_element.find('div', class_='v-textarea'): # Check for v-textarea class which contains the textarea
                textarea_found = True
                
                # Try to find charLimit from v-counter
                v_counter = current_element.find('div', class_='v-counter')
                if v_counter:
                    match = re.search(r'/\s*(\d+)', v_counter.get_text())
                    if match:
                        char_limit = int(match.group(1))
                
                # If charLimit is still not found, try to extract from the raw question text
                if char_limit is None:
                    char_limit_match = re.search(r'최대\s*(\d+)자', question_text_raw)
                    if char_limit_match:
                        char_limit = int(char_limit_match.group(1))
                    else:
                        char_limit_match = re.search(r'(\d+)자\s*이내', question_text_raw)
                        if char_limit_match:
                            char_limit = int(char_limit_match.group(1))

                questions_data.append({
                    "question": question_text,
                    "charLimit": char_limit,
                    "order": order
                })
                break # Move to the next question_div
            elif current_element and current_element.name == 'div': # Continue searching within sibling divs
                pass
            else: # If it's not a div or we've gone too far, break
                break
    
    return {"questions": questions_data}

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                html_input = f.read()
        else:
            # Print error to stderr and exit
            print(f"Error: File not found at {file_path}", file=sys.stderr)
            sys.exit(1)
    else:
        # Fallback to reading from stdin if no file path is provided (for testing/debugging)
        html_input = sys.stdin.buffer.read().decode('utf-8')
    
    result = parse_self_introduction_form(html_input)
    
    # Encode the JSON output to base64
    json_output_bytes = json.dumps(result, ensure_ascii=False, indent=2).encode('utf-8')
    base64_encoded_output = base64.b64encode(json_output_bytes).decode('ascii')
    
    print(base64_encoded_output)
