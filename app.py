import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import json
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes, allowing the frontend to communicate with this backend
CORS(app)

# Configure the Gemini API client
# Assuming the user sets GEMINI_API_KEY in the environment or .env file.
api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyBgzvtsBJkLjKgT3tNaTSusxSWQphoCczU")
genai.configure(api_key=api_key)

# Use the latest Flash model which is great for generation speeds and standard tasks
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    """
    POST /generate endpoint.
    Accepts JSON: { "goal": "User's goal text" }
    Returns structured JSON with tasks, timeline, risks, and next action.
    """
    data = request.get_json()
    if not data or 'goal' not in data:
        return jsonify({"error": "Missing 'goal' field in JSON request body."}), 400

    goal_text = data['goal'].strip()
    mode = data.get('mode', 'balanced')
    
    if not goal_text:
        return jsonify({"error": "Goal text cannot be empty."}), 400

    mode_instruction = ""
    if mode == "fast":
        mode_instruction = "Provide a FAST mode plan: minimal, essential tasks only. Keep it brief."
    elif mode == "detailed":
        mode_instruction = "Provide a DETAILED mode plan: comprehensive, granular steps covering all bases."
    else:
        mode_instruction = "Provide a BALANCED mode plan: a moderate, highly effective set of steps."

    prompt = f"""
    You are the AI brain behind "LifeLens AI", an advanced goal-planning platform.
    Analyze the following goal from the user: "{goal_text}"
    {mode_instruction}
    
    Evaluate the complexity of this goal (beginner, intermediate, or advanced) and map out the steps.
    
    Return ONLY a valid JSON object matching this EXACT schema:
    {{
      "goal": "A clearly stated, refined format of the user's goal",
      "intent_type": "urgent, productivity, or calm",
      "complexity": "beginner, intermediate, or advanced",
      "tasks": [
        {{"desc": "Actionable task description", "priority": "high", "importance": "Why critical"}},
        {{"desc": "Actionable task description", "priority": "medium", "importance": ""}},
        {{"desc": "Actionable task description", "priority": "low", "importance": ""}}
      ],
      "timeline": ["Phase 1 - Detailed description of what to do in this phase...", "Phase 2 - Detailed description..."],
      "risks": [
        {{"desc": "Risk description", "severity": "high", "mitigation": "Clear mitigation strategy"}},
        {{"desc": "Risk description", "severity": "low", "mitigation": "Clear mitigation strategy"}}
      ],
      "next_action": "The absolute most important, immediate next step"
    }}
    
    Make the response highly dynamic, detailed, insightful, and practical. Do NOT use any markdown formatting like ** or __ anywhere.
    """

    try:
        # Generate the structured response from Gemini
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Strip potential markdown formatting before parsing
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse output as JSON (safeguard checking)
        result_json = json.loads(response_text)
        return jsonify(result_json), 200

    except json.JSONDecodeError as e:
        return jsonify({"error": "Failed to parse AI response into JSON", "raw_response": response_text}), 500
    except Exception as e:
        return jsonify({"error": "An internal error occurred", "details": str(e)}), 500

@app.route('/explain', methods=['POST'])
def explain():
    data = request.get_json()
    if not data or 'plan' not in data:
        return jsonify({"error": "Missing 'plan' field"}), 400
        
    plan = data['plan']
    prompt = f"Explain the reasoning behind this generated plan in 2-3 short, encouraging sentences indicating why this works: {json.dumps(plan)}"
    
    try:
        # Just text output, not JSON format from the model
        text_model = genai.GenerativeModel('gemini-2.5-flash')
        response = text_model.generate_content(prompt)
        return jsonify({"explanation": response.text.strip()}), 200
    except Exception as e:
        return jsonify({"error": "Explanation failed", "details": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Missing message field"}), 400
        
    message = data['message']
    prompt = f"You are a helpful and concise assistant for the LifeLens AI platform. Provide a brief, encouraging response to the user's message: '{message}'"
    
    try:
        chat_model = genai.GenerativeModel('gemini-2.5-flash')
        response = chat_model.generate_content(prompt)
        return jsonify({"reply": response.text.strip()}), 200
    except Exception as e:
        return jsonify({"error": "Chat failed", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "LifeLens AI Backend"}), 200

if __name__ == '__main__':
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)
