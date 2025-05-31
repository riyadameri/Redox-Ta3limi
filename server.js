require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');
const moment = require('moment');

const app = express();
const server = require('http').createServer(app);
const io = socketio(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Models
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true, unique: true },
  birthDate: Date,
  parentName: String,
  parentPhone: String,
  registrationDate: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  classes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class' 
  }]
}, { strictPopulate: false });

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: String,
  phone: String,
  hireDate: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }
});

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  schedule: {
    day: { type: String, enum: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] },
    time: String
  },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  price: { type: Number, required: true }
});

const cardSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  issueDate: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // YYYY-MM
  paymentDate: { type: Date, default: null },
  status: { type: String, enum: ['paid', 'pending', 'late'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'online'], default: 'cash' }
});

const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Class = mongoose.model('Class', classSchema);
const Card = mongoose.model('Card', cardSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
.catch(err => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// RFID Reader
let serialPort;
try {
  serialPort = new SerialPort({ 
    path: process.env.RFID_PORT, 
    baudRate: 9600 
  });
  
  const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  parser.on('data', async (data) => {
    if (data.startsWith('UID:')) {
      const uid = data.trim().substring(4).trim();
      console.log('تم الكشف عن البطاقة:', uid);
      
      try {
        const card = await Card.findOne({ uid }).populate('student');
        if (card) {
          const student = await Student.findById(card.student._id)
            .populate({
              path: 'classes',
              populate: [
                { path: 'teacher', model: 'Teacher' },
                { path: 'students', model: 'Student' }
              ]
            });
          
          const payments = await Payment.find({ student: card.student._id })
            .populate('class');
          
          io.emit('student-detected', {
            student,
            card,
            classes: student.classes || [],
            payments: payments || []
          });
        } else {
          io.emit('unknown-card', { uid });
        }
      } catch (err) {
        console.error('خطأ في معالجة البطاقة:', err);
        io.emit('card-error', { error: 'حدث خطأ في معالجة البطاقة' });
      }
    }
  });

  serialPort.on('error', err => console.error('خطأ في منفذ RFID:', err));
} catch (err) {
  console.error('فشل في تهيئة قارئ RFID:', err);
}

// API Routes

// Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    // Remove student from classes first
    await Class.updateMany(
      { students: req.params.id },
      { $pull: { students: req.params.id } }
    );
    
    // Delete associated payments and cards
    await Payment.deleteMany({ student: req.params.id });
    await Card.deleteMany({ student: req.params.id });
    
    // Finally delete the student
    await Student.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ name: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teachers/:id', async (req, res) => {
  try {
    // Remove teacher from classes first
    await Class.updateMany(
      { teacher: req.params.id },
      { $unset: { teacher: "" } }
    );
    
    // Delete the teacher
    await Teacher.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Classes
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teacher')
      .populate('students');
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const classObj = new Class(req.body);
    await classObj.save();
    res.status(201).json(classObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/classes/:id', async (req, res) => {
  try {
    const classObj = await Class.findById(req.params.id)
      .populate('teacher')
      .populate('students');
    if (!classObj) return res.status(404).json({ error: 'Class not found' });
    res.json(classObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    // Remove class from students first
    await Student.updateMany(
      { classes: req.params.id },
      { $pull: { classes: req.params.id } }
    );
    
    // Delete associated payments
    await Payment.deleteMany({ class: req.params.id });
    
    // Delete the class
    await Class.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign Teacher to Class
app.post('/api/classes/:classId/assign-teacher/:teacherId', async (req, res) => {
  try {
    const classObj = await Class.findByIdAndUpdate(
      req.params.classId,
      { teacher: req.params.teacherId },
      { new: true }
    ).populate('teacher');
    
    res.json(classObj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Enroll Student in Class
app.post('/api/classes/:classId/enroll/:studentId', async (req, res) => {
  try {
    // 1. Check if class and student exist
    const classObj = await Class.findById(req.params.classId);
    const student = await Student.findById(req.params.studentId);
    
    if (!classObj || !student) {
      return res.status(404).json({ error: 'Class or student not found' });
    }

    // 2. Add student to class if not already enrolled
    if (!classObj.students.includes(req.params.studentId)) {
      classObj.students.push(req.params.studentId);
      await classObj.save();
    }

    // 3. Add class to student if not already added
    if (!student.classes.includes(req.params.classId)) {
      student.classes.push(req.params.classId);
      await student.save();
    }

    // 4. Create monthly payments for student
    const startDate = moment(student.registrationDate);
    const currentDate = moment();
    const endDate = currentDate.clone().add(1, 'year');
    
    const months = [];
    let currentDateIter = startDate.clone();
    
    while (currentDateIter.isBefore(endDate)) {
      months.push(currentDateIter.format('YYYY-MM'));
      currentDateIter.add(1, 'month');
    }
    
    const createdPayments = [];
    for (const month of months) {
      const paymentExists = await Payment.findOne({
        student: req.params.studentId,
        class: req.params.classId,
        month
      });
      
      if (!paymentExists) {
        const payment = new Payment({
          student: req.params.studentId,
          class: req.params.classId,
          amount: classObj.price,
          month,
          status: moment(month).isBefore(currentDate, 'month') ? 'late' : 'pending'
        });
        
        await payment.save();
        createdPayments.push(payment);
      }
    }
    
    res.json({
      message: `تم إضافة الطالب ${student.name} للحصة ${classObj.name} بنجاح`,
      class: classObj,
      payments: await Payment.find({ 
        student: req.params.studentId, 
        class: req.params.classId 
      }).sort({ month: 1 })
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unenroll Student from Class
app.delete('/api/classes/:classId/unenroll/:studentId', async (req, res) => {
  try {
    // Remove student from class
    await Class.findByIdAndUpdate(
      req.params.classId,
      { $pull: { students: req.params.studentId } }
    );
    
    // Remove class from student
    await Student.findByIdAndUpdate(
      req.params.studentId,
      { $pull: { classes: req.params.classId } }
    );
    
    // Delete associated payments
    await Payment.deleteMany({
      student: req.params.studentId,
      class: req.params.classId
    });
    
    res.json({ message: 'Student unenrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payments
app.get('/api/payments', async (req, res) => {
  try {
    let query = {};
    
    if (req.query.student) query.student = req.query.student;
    if (req.query.class) query.class = req.query.class;
    if (req.query.month) query.month = req.query.month;
    
    const payments = await Payment.find(query)
      .populate('student')
      .populate('class')
      .sort({ month: 1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student')
      .populate('class');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Payment
app.put('/api/payments/:id/pay', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paymentDate: req.body.paymentDate || new Date(),
        paymentMethod: req.body.paymentMethod || 'cash',
        amount: req.body.amount
      },
      { new: true }
    ).populate('student').populate('class');
    
    res.json({
      message: `تم تسديد دفعة ${payment.month} للطالب ${payment.student.name}`,
      payment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cards
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await Card.find().populate('student');
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    // Check if card already exists
    const existingCard = await Card.findOne({ uid: req.body.uid });
    if (existingCard) {
      return res.status(400).json({ error: 'Card already assigned to a student' });
    }
    
    const card = new Card(req.body);
    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await Card.findByIdAndDelete(req.params.id);
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student Payments
app.get('/api/students/:studentId/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.params.studentId })
      .populate('class')
      .sort({ month: 1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// Enroll Student in Class
app.post('/api/classes/:classId/enroll/:studentId', async (req, res) => {
  try {
    // 1. Check if class and student exist
    const classObj = await Class.findById(req.params.classId);
    const student = await Student.findById(req.params.studentId);
    
    if (!classObj || !student) {
      return res.status(404).json({ error: 'Class or student not found' });
    }

    // 2. Add student to class if not already enrolled
    if (!classObj.students.includes(req.params.studentId)) {
      classObj.students.push(req.params.studentId);
      await classObj.save();
    }

    // 3. Add class to student if not already added
    if (!student.classes.includes(req.params.classId)) {
      student.classes.push(req.params.classId);
      await student.save();
    }

    // 4. Create monthly payments for student
    const startDate = moment(student.registrationDate);
    const currentDate = moment();
    const endDate = currentDate.clone().add(1, 'year');
    
    const months = [];
    let currentDateIter = startDate.clone();
    
    while (currentDateIter.isBefore(endDate)) {
      months.push(currentDateIter.format('YYYY-MM'));
      currentDateIter.add(1, 'month');
    }
    
    const createdPayments = [];
    for (const month of months) {
      const paymentExists = await Payment.findOne({
        student: req.params.studentId,
        class: req.params.classId,
        month
      });
      
      if (!paymentExists) {
        const payment = new Payment({
          student: req.params.studentId,
          class: req.params.classId,
          amount: classObj.price,
          month,
          status: moment(month).isBefore(currentDate, 'month') ? 'late' : 'pending'
        });
        
        await payment.save();
        createdPayments.push(payment);
      }
    }
    
    res.json({
      message: `تم إضافة الطالب ${student.name} للحصة ${classObj.name} بنجاح`,
      class: classObj,
      payments: await Payment.find({ 
        student: req.params.studentId, 
        class: req.params.classId 
      }).sort({ month: 1 })
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على http://localhost:${PORT}`);
});