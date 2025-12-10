// modules and dependencies
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cronService = require('./services/cronService');
const session = require('express-session');


// semua routes
const maintenanceMiddleware = require("./middleware/maintenance");
const uploadRoutes = require("./routes/uploader/uploadRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const authRoutes = require("./routes/auth/authRoutes");
const studentRoutes = require("./routes/student/studentRoutes");
const viewController = require("./controllers/viewController");
const viewRoutes = require("./routes/viewRoutes");
const taskRoutes = require("./routes/task/taskRoutes");
const notificationRoutes = require("./routes/notification/notificationRoutes");
const { initCronJobs } = require("./services/cronServiceNotification");


const app = express();
app.use(maintenanceMiddleware);


// port server
const port = process.env.PORT_SERVER || process.env.PORT

if (!port) {
    console.error('error file .env belum ada yang berisi port server.');
    process.exit(1);
}

app.use(express.static(path.join(__dirname, 'views')));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24jam sekarang
      httpOnly: false,
    },
  })
);



app.use(morgan('dev'));
app.use(express.static('public'));
app.use('/views', express.static(path.join(__dirname, 'views')));

// ==================== SERVICE UPLOADER PROXY ====================
app.use(uploadRoutes);


// ==================== ADMIN ROUTES ====================

app.use(adminRoutes);

// =================== MAHASISWA ROUTES ====================

app.use("/auth", authRoutes); 
app.use("/api/student", studentRoutes);

app.get("/editor-tugas.html", viewController.viewEditorTugas);
app.use("/", viewRoutes);
app.use("/tugas", taskRoutes);
app.use(authRoutes);


// ==================== PUSH NOTIFICATION WEB SERVICE ====================
app.use(notificationRoutes);

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'notfound.html'));
});

initCronJobs();
cronService.start();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
