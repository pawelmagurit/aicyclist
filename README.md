# AI Coach - Intelligent Training Assistant

An AI-powered cycling training assistant that integrates with Garmin Connect via MCP (Model Context Protocol) to provide intelligent workout generation, training plan creation, and performance analysis.

## 🎯 Features

- **Garmin Connect Integration**: Fetch activity data and upload structured workouts
- **AI-Powered Analysis**: Analyze training data to determine fitness levels and training zones
- **Structured Workout Generation**: Create Garmin-compatible workouts (FTP intervals, VO2max, endurance)
- **Training Plan Creation**: Generate personalized 4-week training plans
- **MCP Server**: Expose training data and AI capabilities to ChatGPT
- **Modern Dashboard**: Clean, responsive UI built with Next.js and Tailwind CSS

## 🏗️ Architecture

### Backend (MCP Server)
- **Stack**: Node.js + Express + TypeScript
- **Database**: SQLite for local data storage
- **Authentication**: Garmin OAuth2 (mock implementation for development)
- **API**: RESTful endpoints for activities, workouts, and training plans
- **MCP Integration**: Expose resources and tools for AI interaction

### Frontend
- **Stack**: Next.js 14 + React + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Garmin Connect API credentials (for production)

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd aicyclist
```

2. **Setup Backend:**
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Setup Frontend:**
```bash
cd ../frontend
npm install
cp env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MCP Manifest: http://localhost:3001/mcp/manifest

## 📊 API Endpoints

### Activities
- `GET /api/activities?userId={id}` - Fetch user activities
- `GET /api/activities/{id}` - Get specific activity details
- `POST /api/activities/sync` - Sync activities from Garmin

### Workouts
- `GET /api/workouts?userId={id}` - Get user workouts
- `POST /api/workouts` - Create new workout
- `POST /api/workouts/{id}/upload` - Upload workout to Garmin
- `POST /api/workouts/batch-upload` - Upload multiple workouts

### Training Plans
- `GET /api/plans?userId={id}` - Get active training plan
- `POST /api/plans` - Create training plan
- `POST /api/plans/generate` - Generate AI-powered plan

### MCP Endpoints
- `GET /mcp/manifest` - MCP server manifest
- `GET /mcp/resources/{resource}` - Access MCP resources
- `POST /mcp/tools/{tool}` - Execute MCP tools

## 🔧 Configuration

### Backend Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Garmin Connect API
GARMIN_CLIENT_ID=your_garmin_client_id
GARMIN_CLIENT_SECRET=your_garmin_client_secret
GARMIN_REDIRECT_URI=http://localhost:3001/auth/garmin/callback
GARMIN_BASE_URL=https://apis.garmin.com

# OpenAI API (for AI workout generation)
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_PATH=./data/ai-coach.db

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🎮 Usage

### 1. Connect Garmin Account
- Click "Connect Garmin" in the dashboard
- Complete OAuth2 flow (mock implementation in development)
- Activities will be automatically synced

### 2. Generate Training Plan
- Click "Generate Plan" to create an AI-powered training plan
- Specify your goals (FTP improvement, VO2max, endurance)
- Review the generated 4-week plan

### 3. Create Workouts
- Use the AI chat to request specific workouts
- Workouts are automatically formatted for Garmin Connect
- Upload workouts directly to your Garmin calendar

### 4. Monitor Progress
- View training load charts and metrics
- Track FTP estimates and training zones
- Analyze performance trends

## 🤖 MCP Integration

The backend exposes MCP resources and tools for AI interaction:

### Resources
- **activities**: User activity data from Garmin Connect
- **workouts**: Structured workouts for Garmin Connect  
- **plans**: AI-generated training plans

### Tools
- **analyze_activities**: Analyze fitness level and training zones
- **generate_workout**: Create structured workouts
- **generate_plan**: Generate complete training plans
- **upload_workout**: Upload workouts to Garmin Connect

### Example MCP Usage

```json
{
  "tool": "generate_plan",
  "parameters": {
    "userId": "user123",
    "goal": "Increase FTP",
    "focus": "Threshold training",
    "duration": 4
  }
}
```

## 📈 Garmin Structured Workouts

Workouts follow Garmin's structured workout schema:

```json
{
  "workoutName": "FTP Build – 5x8min @ 95%",
  "sportType": "cycling",
  "workoutSegments": [
    {
      "durationType": "warmup",
      "duration": 600,
      "targetType": "power",
      "targetValue": 0.55
    },
    {
      "durationType": "interval", 
      "duration": 480,
      "targetType": "power",
      "targetValue": 0.95
    },
    {
      "durationType": "recovery",
      "duration": 240,
      "targetType": "power", 
      "targetValue": 0.5
    }
  ]
}
```

## 🧪 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Database
The SQLite database is automatically created on first run. Tables include:
- `users` - Garmin user accounts and tokens
- `activities` - Synced activity data
- `workouts` - Generated structured workouts
- `training_plans` - AI-generated training plans

## 🚀 Production Deployment

### Backend
1. Set up production environment variables
2. Configure Garmin Connect API credentials
3. Set up proper OAuth2 redirect URLs
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Update API URLs for production

### MCP Integration
1. Register your MCP server with ChatGPT
2. Provide the manifest URL: `https://your-domain.com/mcp/manifest`
3. Configure authentication if required

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please open an issue on GitHub or contact the development team.

---

**Note**: This is an MVP implementation with mock Garmin API endpoints for development. For production use, integrate with real Garmin Connect API endpoints and implement proper OAuth2 authentication.
