# SafeTrack - Project Management System

A modern, responsive project management application designed specifically for Equitas Health, combining the power of Tailwind CSS and Bootstrap 5.

## 🚀 Features

- **Dashboard Overview** - Real-time project statistics and recent activity
- **Project Management** - Create, edit, delete, and track project progress
- **Search & Filter** - Find projects quickly with real-time search and status filtering
- **Compliance Tracking** - Monitor safety compliance and training completion
- **Reports & Analytics** - Generate reports and export data
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **Data Persistence** - Projects are saved to localStorage

## 🛠️ Technologies Used

- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first CSS framework
- **Bootstrap 5** - Component library for enhanced UI
- **JavaScript (ES6+)** - Modern JavaScript with classes and modules
- **Font Awesome** - Icon library
- **LocalStorage** - Client-side data persistence

## 📁 Project Structure

```
project-tracker/
├── index.html              # Main HTML file
├── assets/
│   ├── css/
│   │   └── style.css       # Custom CSS styles
│   ├── js/
│   │   └── app.js          # JavaScript application logic
│   └── images/             # Image assets (if needed)
└── README.md               # This file
```

## 🚀 Getting Started

1. **Clone or Download** the project folder
2. **Open** `index.html` in any modern web browser
3. **Start using** the application immediately - no server setup required!

## 📱 Usage

### Creating a New Project
1. Click the "New Project" button in the header
2. Fill in the project details (name, description, priority, category, due date)
3. Click "Create Project" to save

### Managing Projects
- **View All Projects** - Click the "All Projects" tab
- **Search Projects** - Use the search box to find specific projects
- **Filter by Status** - Use the dropdown to filter by project status
- **Edit Project** - Click the edit button (pencil icon) next to any project
- **Delete Project** - Click the delete button (trash icon) next to any project

### Dashboard
- View real-time statistics for active projects, at-risk projects, team members, and overdue items
- See recent project activity with progress indicators

## 🎨 Customization

### Colors
The application uses a custom color scheme defined in the Tailwind config:
- `safety-blue`: #1e40af
- `safety-green`: #059669
- `safety-orange`: #ea580c
- `safety-red`: #dc2626
- `safety-gray`: #6b7280

### Styling
- Custom styles are in `assets/css/style.css`
- Bootstrap classes are used for components
- Tailwind utilities are used for layout and spacing

## 🔧 Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 📊 Data Storage

Projects are stored in the browser's localStorage, so they persist between sessions. To clear all data, you can:
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage for this site

## 🤝 Contributing

Feel free to customize this project for your specific needs:
- Add new project categories
- Implement user authentication
- Add team member management
- Integrate with a backend API
- Add more reporting features

## 📄 License

This project is open source and available under the MIT License.

---

**SafeTrack** - Making project management safe and efficient for healthcare teams.
