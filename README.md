# AI-Powered Mail Application

An intelligent email client that combines Gmail's power with AI-driven natural language control. Simply tell the assistant what you want to do, and watch it handle your emails—from composing and sending to filtering and organizing.

![Project Status](https://img.shields.io/badge/status-production--ready-green)
![TypeScript](https://img.shields.io/badge/TypeScript-0_errors-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

## ✨ Features

### 🤖 AI Assistant Control
- **Natural Language Commands**: Control your inbox using conversational language
- **Smart Actions**: Send emails, filter messages, reply, compose, and more
- **Context-Aware**: AI understands current email context for intelligent replies

### 📧 Full Gmail Integration
- **Real-time Inbox**: Fetch and display your Gmail messages
- **Send Emails**: Compose and send emails directly from the app
- **Profile Integration**: Display user name and avatar
- **OAuth Authentication**: Secure Google account login

### 🎯 Advanced Features
- **Smart Filters**: Server-side filtering by sender (Gmail API), date range, unread status
- **Intelligent Search**: Client-side search with visual badges and unified filter clearing
- **Smart Polling**: Auto-pauses when tab hidden, composing, or reading emails (saves API calls)
- **Quick Reply & Forward**: AI-assisted replies and forwards with confirmation modal
- **Compose Assistance**: AI helps fill in recipients, subjects, and message body
- **Context-Aware Actions**: AI clears filters when needed (e.g., "show latest email" after filtering)


### 🛡️ Production-Ready
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Form Validation**: Multi-layer validation (AI → Client → Server)
- **Type Safety**: Full TypeScript with zero compilation errors
- **Responsive UI**: Works on desktop and mobile devices

---

## 📋 Table of Contents
- [Setup Instructions](#-setup-instructions)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Trade-offs & Decisions](#-trade-offs--decisions)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Tech Stack](#-tech-stack)

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **Gmail account** for testing
- **OpenAI API key** ([Get one here](https://platform.openai.com/api-keys))
- **Google Cloud Project** with Gmail API enabled

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sgoyalsmvj/ai-mail-app.git
cd ai-mail-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000) in your browser

---

## 🔐 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing one
3. Name your project (e.g., "AI Mail App")
4. Click **"Create"**

### Step 2: Enable Gmail API

1. In your project dashboard, go to **"APIs & Services" → "Library"**
2. Search for **"Gmail API"**
3. Click on it and press **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** user type (for testing)
3. Fill in required fields:
   - **App name**: AI Mail App
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"**
5. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Add test users (your Gmail account)
7. Click **"Save and Continue"**

### Step 4: Create OAuth Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth 2.0 Client ID"**
3. Select **"Web application"**
4. Configure:
   - **Name**: AI Mail App
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
5. Click **"Create"**
6. Copy the **Client ID** and **Client Secret**
7. Paste them into your `.env.local` file

### Step 5: Generate NextAuth Secret

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```
Add the output to `NEXTAUTH_SECRET` in `.env.local`

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ Natural Language Command
       ▼
┌─────────────────────────────────────────┐
│          AI Assistant Layer             │
│  (OpenAI API - GPT-4 with Structured    │
│   Output for JSON Action Generation)    │
└──────┬──────────────────────────────────┘
       │ JSON Actions Array
       ▼
┌─────────────────────────────────────────┐
│        Action Dispatcher Layer          │
│    (Zustand Store - executeAction)      │
│  • Validates actions                    │
│  • Executes sequentially                │
│  • Updates UI state                     │
└──────┬──────────────────────────────────┘
       │ State Updates
       ▼
┌─────────────────────────────────────────┐
│         React Component Layer           │
│  • EmailList (inbox display)            │
│  • ComposeForm (email composition)      │
│  • AssistantPanel (AI interaction)      │
└──────┬──────────────────────────────────┘
       │ API Calls (fetch, send)
       ▼
┌─────────────────────────────────────────┐
│        Gmail API Integration            │
│  • Fetch inbox emails                   │
│  • Send emails                          │
│  • OAuth token management               │
└─────────────────────────────────────────┘
```

### AI Control Flow

**User Command** → **LLM Processing** → **JSON Actions** → **Action Dispatcher** → **UI State Update** → **React Re-render**

**Example Flow:**
```
User: "Send an email to john@example.com saying hello"
  ↓
OpenAI GPT-4 generates:
{
  "actions": [
    { "type": "FILL_COMPOSE", "to": "john@example.com", "subject": "Hello", "body": "Hello," },
    { "type": "SEND_EMAIL" }
  ],
  "message": "I've sent the email to john@example.com"
}
  ↓
Dispatcher executes actions sequentially:
  1. Updates composeForm state
  2. Calls /api/mail/send
  3. Shows success toast
```

### Core Components

#### 1. Mail Service Layer (`lib/gmail.ts`)
- **Responsibility**: Gmail API integration with server-side filtering
- **Functions**:
  - `fetchInboxEmails(accessToken, options)` - Retrieves emails with filters
  - `buildGmailQuery()` - Constructs Gmail search queries (from:, after:, before:)
  - Integration with custom error classes
- **Server-Side Filtering**: Uses Gmail API operators for sender and date filtering
- **Error Handling**: Exponential backoff, typed errors

#### 2. UI State Layer (`store/mailStore.ts`)
- **Responsibility**: Centralized state management and action orchestration
- **State**:
  - `emails[]` - Inbox messages (filtered server-side)
  - `filteredEmails[]` - Client-side search/unread filtering
  - `currentEmail` - Selected email for viewing
  - `composeForm` - Draft email data
  - `filters` - Active filter settings (sender, dateFrom, dateTo, dateRange, unread)
  - `searchQuery` - Active search text
- **Actions**:
  - `fetchEmails(accessToken)` - Load inbox with server-side filters
  - `applyFilters()` - Apply client-side filters (search, unread)
  - `executeAction(action, accessToken)` - AI action dispatcher with async support
  - `setFilters()` - Update filters and trigger API refetch

#### 3. AI Command Layer (`lib/assistant.ts`)
- **Responsibility**: Natural language processing
- **Function**: `processCommand(command: string)`
- **Output**: Structured JSON with actions array
- **Retry Logic**: 3 attempts with exponential backoff

#### 4. React Components
- **`AssistantPanel.tsx`**: Chat interface for AI commands
- **`EmailList.tsx`**: Inbox display with filters
- **`EmailDetail.tsx`**: Single email view with HTML rendering
- **`ComposeForm.tsx`**: Email composition with validation
- **`Sidebar.tsx`**: Navigation and user profile

### Action Types

The AI can generate these actions:

| Action | Parameters | Description |
|--------|------------|-------------|
| `FILTER_EMAILS` | `search`, `sender`, `dateFrom`, `dateTo`, `unread` | Filter inbox by criteria |
| `OPEN_EMAIL` | `index` | Open email at given position |
| `FILL_COMPOSE` | `to`, `subject`, `body` | Fill compose form fields |
| `SEND_EMAIL` | - | Send the current draft |
| `REPLY_TO_CURRENT` | - | Reply to selected email |
| `RESET_FILTERS` | - | Clear all active filters |
| `CLEAR_COMPOSE` | - | Clear the compose form |

---

## 💡 How It Works

### Example 1: Sending an Email

**User Command:**
```
"Send an email to john@example.com with subject 'Meeting' and say let's meet tomorrow"
```

**AI Response:**
```json
{
  "actions": [
    {
      "type": "FILL_COMPOSE",
      "to": "john@example.com",
      "subject": "Meeting",
      "body": "Let's meet tomorrow."
    },
    {
      "type": "SEND_EMAIL"
    }
  ],
  "message": "I've sent the email to john@example.com"
}
```

**Code Execution:**
```typescript
// In store/mailStore.ts - executeAction()
case "FILL_COMPOSE":
  // Validate email format
  if (action.to && !emailRegex.test(action.to)) {
    toast.error("Invalid email address");
    break;
  }
  // Update compose form state
  set({ composeForm: { ...state.composeForm, ...action } });
  break;

case "SEND_EMAIL":
  // Validate required fields
  if (!composeForm.to || !composeForm.subject || !composeForm.body) {
    toast.error("Please fill in all fields");
    break;
  }
  // Call API endpoint
  const response = await fetch("/api/mail/send", {
    method: "POST",
    body: JSON.stringify(composeForm),
  });
  // Show success/error toast
  toast.success("Email sent successfully!");
  break;
```

### Example 2: Server-Side Filtering

**User Command:**
```
"Find emails from saurabh goyal from last week"
```

**AI Response:**
```json
{
  "actions": [
    {
      "type": "FILTER_EMAILS",
      "sender": "saurabh goyal",
      "dateRange": "last_week"
    }
  ],
  "message": "Showing emails from saurabh goyal from the last 7 days"
}
```

**Code Execution:**
```typescript
// In store/mailStore.ts - executeAction()
case "FILTER_EMAILS":
  get().setFilters({
    sender: action.sender,
    dateRange: action.dateRange
  });
  
  // If accessToken provided, refetch from Gmail API with filters
  if (accessToken) {
    await get().fetchEmails(accessToken);
  }
  break;

// In store/mailStore.ts - fetchEmails()
const fetchEmails = async (accessToken: string) => {
  const { filters } = get();
  
  // Build query params for server-side filtering
  const params = new URLSearchParams();
  if (filters.sender) params.append("sender", filters.sender);
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  
  // Gmail API filters emails server-side using from: and after: operators
  const response = await fetch(`/api/mail/inbox?${params}`);
  const data = await response.json();
  
  // Only matching emails are returned
  set({ emails: data.emails });
};
```

### Example 3: Smart Reply

**User Command:**
```
"Reply to this email and say I'll be there at 3pm"
```

**AI Response:**
```json
{
  "actions": [
    {
      "type": "REPLY_TO_CURRENT"
    },
    {
      "type": "FILL_COMPOSE",
      "body": "I'll be there at 3pm."
    },
    {
      "type": "SEND_EMAIL"
    }
  ],
  "message": "I've sent the reply"
}
```

**Code Execution:**
```typescript
case "REPLY_TO_CURRENT":
  if (!currentEmail) {
    toast.error("No email selected");
    break;
  }
  
  // Extract email from "Name <email>" format
  const emailMatch = currentEmail.from.match(/<(.+?)>/);
  const toEmail = emailMatch ? emailMatch[1] : currentEmail.from;
  
  // Create reply subject
  const replySubject = currentEmail.subject.startsWith("Re:") 
    ? currentEmail.subject 
    : `Re: ${currentEmail.subject}`;
  
  // Include quoted original message
  const quotedBody = `\n\n---\nOn ${currentEmail.date}, ${currentEmail.from} wrote:\n${currentEmail.body}`;
  
  set({
    composeForm: {
      to: toEmail,
      subject: replySubject,
      body: quotedBody,
    },
  });
  break;
```

---

## ⚖️ Trade-offs & Decisions

### 1. Polling vs Pub/Sub for Email Updates

**Decision: Smart Polling (30-second interval)**

**Why:**
- ✅ Simpler implementation - no WebSocket server needed
- ✅ Faster to build for MVP/prototype
- ✅ Works well with Next.js serverless architecture
- ✅ Good enough for demo purposes (30s delay acceptable)
- ✅ **Smart pausing**: Auto-pauses when:
  - Tab is not visible (document.hidden)
  - User is composing an email
  - User is viewing email details
- ✅ **Filter-aware**: Respects active filters (sender, date range)

**Trade-offs:**
- ❌ Not real-time (delay up to 30 seconds)
- ✅ Optimized API calls (pauses when not needed)
- ✅ Reduced quota usage vs continuous polling

**Production Alternative:**
- Use Gmail Pub/Sub push notifications
- WebSocket for instant UI updates
- More complex but truly real-time

### 2. Fixed Action Vocabulary vs Free-Form Commands

**Decision: Fixed set of 7 action types**

**Why:**
- ✅ Predictable behavior - easier to test
- ✅ Type-safe with TypeScript discriminated unions
- ✅ Clear boundaries for what AI can do
- ✅ Easier error handling and validation

**Trade-offs:**
- ❌ Less flexible than free-form
- ❌ Requires prompt engineering to fit actions

**Alternative Considered:**
- Free-form natural language → direct API calls
- More flexible but harder to validate and secure

### 3. Zustand vs Redux for State Management

**Decision: Zustand**

**Why:**
- ✅ Minimal boilerplate compared to Redux
- ✅ Excellent TypeScript support
- ✅ Simple API with hooks
- ✅ No need for complex middleware for this app scale

**Trade-offs:**
- ❌ Less tooling (no Redux DevTools time travel)
- ❌ Smaller community than Redux

**When Redux Makes Sense:**
- Larger team needing strict patterns
- Complex state with many interdependencies
- Need for advanced debugging tools

### 4. OpenAI Structured Outputs vs JSON Mode

**Decision: Structured Outputs (response_format with JSON schema)**

**Why:**
- ✅ Guaranteed valid JSON every time
- ✅ Type-safe parsing - no try/catch for JSON.parse
- ✅ Schema validation by OpenAI
- ✅ Better than old JSON mode (more reliable)

**Trade-offs:**
- ❌ Requires GPT-4o or later models
- ❌ Slightly higher API cost

### 5. Client-Side vs Server-Side AI Processing

**Decision: Client-side fetch to OpenAI, server-side for Gmail**

**Why:**
- ✅ AI processing doesn't need user credentials
- ✅ Simpler architecture - no extra API route
- ✅ Faster response (no extra hop through server)
- ✅ Gmail API requires OAuth tokens (must be server-side)

**Trade-offs:**
- ❌ OpenAI API key exposed to client (rate limiting concerns)
- ✅ For production: Move to server-side API route

### 6. Hybrid Filtering: Server-Side + Client-Side

**Decision: Server-side for sender/date, client-side for search/unread**

**Why:**
- ✅ **Server-side (Gmail API)**:
  - Sender filtering uses `from:` operator
  - Date filtering uses `after:` and `before:` operators
  - Reduces data transfer (only matching emails returned)
  - Scales well with large inboxes
- ✅ **Client-side (JavaScript)**:
  - Search query (subject/from/snippet matching)
  - Unread status filter
  - Instant filtering without API calls
  - Good for quick UI interactions

**Architecture:**
```typescript
// Server-side: Gmail API query
GET /api/mail/inbox?sender=john&dateFrom=2026-02-01
→ Gmail filters: "from:john after:2026/02/01"
→ Returns 10 emails

// Client-side: Apply search/unread
filteredEmails = emails
  .filter(e => e.subject.includes(searchQuery))
  .filter(e => filters.unread ? !e.isRead : true)
→ Display 5 emails
```

**Trade-offs:**
- ✅ Best of both worlds (performance + flexibility)
- ✅ Reduced API quota usage
- ❌ Slightly more complex logic

---

## ⚠️ Known Limitations

### Email Features
- **No Threading**: Emails displayed as flat list, not grouped by conversation
- **Plain Text Only**: Rich text editor not implemented
- **No Attachments**: Cannot send or download attachments
- **Basic Formatting**: HTML emails rendered but no compose formatting tools

### Real-time Sync
- **Smart Polling**: 30-second intervals, auto-pauses when tab hidden/composing/reading
- **Filter-Aware Sync**: Polling respects active filters (dates, sender)
- **No Push Notifications**: Won't know about new emails immediately (requires page visibility)

### AI Capabilities
- **Action Vocabulary**: Limited to 7 predefined actions
- **Context Window**: AI doesn't remember previous commands (stateless)
- **No Email Summarization**: Long emails not automatically summarized

### Gmail Limitations
- **Single Provider**: Only Gmail supported (no Outlook, Yahoo, etc.)
- **Single Account**: One Gmail account per session
- **Read Scope Limited**: Only inbox, not sent/drafts/trash

### Performance
- **Server-Side Filtering**: Sender and date filters use Gmail API (reduces data transfer)
- **Smart API Usage**: Polling pauses when not needed (tab hidden, other views)
- **Large Inboxes**: No pagination - loads all emails at once (mitigated by server-side filtering)
- **Image Loading**: Email images might be slow to load
- **No Offline Mode**: Requires internet connection

---

## 🚀 Future Improvements

### High Priority
1. **Email Threading/Conversations**
   - Group related emails together
   - Show conversation history
   - Smart reply suggestions based on thread

2. **Rich Text Editor**
   - Integrate Quill or TipTap
   - Formatting toolbar (bold, italic, lists)
   - HTML email composition

3. **Attachment Support**
   - Upload and send attachments
   - Download received attachments
   - Preview images/PDFs inline

4. **WebSocket Real-time Sync**
   - Replace polling with Gmail Pub/Sub
   - Instant email notifications
   - Live updates without refresh

### Medium Priority
5. **Advanced AI Features**
   - Email summarization for long messages
   - Sentiment analysis
   - Auto-categorization (important, spam, promotional)
   - Smart reply suggestions

6. **Email Templates**
   - Save common email formats
   - Quick insert template
   - AI-powered template generation

7. **Server-Side Search**
   - Move search to Gmail API for full-text body search
   - Search by attachments
   - Advanced Gmail operators (has:attachment, is:starred, subject:)
   - Currently: Client-side search on fetched emails only

8. **Multi-Account Support**
   - Switch between Gmail accounts
   - Unified inbox view
   - Account-specific settings

### Lower Priority
9. **Offline Mode**
   - IndexedDB caching
   - Queue emails for sending when online
   - Offline-first architecture

10. **Performance Optimization**
    - Virtual scrolling for large lists
    - Lazy loading email content
    - Image optimization/compression

11. **Additional Providers**
    - Microsoft Outlook/Exchange integration
    - Yahoo Mail support
    - IMAP/SMTP generic provider

12. **Mobile App**
    - React Native version
    - Push notifications
    - Biometric authentication

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[Lucide React](https://lucide.dev/)** - Icon library

### State Management
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management
- **React Hooks** - Local component state

### Authentication
- **[NextAuth.js](https://next-auth.js.org/)** - OAuth authentication
- **Google OAuth 2.0** - Secure Gmail access

### APIs & Services
- **[OpenAI API](https://platform.openai.com/)** - GPT-4 for AI assistant
- **[Gmail API](https://developers.google.com/gmail/api)** - Email operations
- **Google OAuth 2.0** - Token management

### Utilities
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - XSS protection for HTML emails
- **[React Hot Toast](https://react-hot-toast.com/)** - Notifications
- **[date-fns](https://date-fns.org/)** - Date formatting

### Error Handling
- **Custom Error Classes** - Typed Gmail errors
- **React Error Boundary** - Component error catching
- **Exponential Backoff** - API retry logic

### Development Tools
- **ESLint** - Code linting
- **TypeScript Strict Mode** - Maximum type safety
- **Turbopack** - Fast bundler (Next.js dev)


### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run TypeScript check: `npm run build`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Open a Pull Request

---


## 📧 Contact

**Saurabh Goyal**
- GitHub: [@sgoyalsmvj](https://github.com/sgoyalsmvj)
- Email: sgoyalsmvj@gmail.com

