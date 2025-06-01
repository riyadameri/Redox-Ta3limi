        // Global variables
        let currentUser = null;
        let currentPayment = null;
        let currentClassId = null;
        let currentStudentId = null;
        let scheduleCounter = 1;
        const socket = io(window.location.origin); // Connects to current host

        // Authentication functions
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Set current user
            currentUser = data.user;
            
            // Update UI
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-name').textContent = currentUser.fullName || currentUser.username;
            document.getElementById('user-role').textContent = getRoleName(currentUser.role);
            
            // Initialize the app
            initApp();
        } else {
            Swal.fire('خطأ', data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        Swal.fire('خطأ', 'حدث خطأ أثناء محاولة تسجيل الدخول', 'error');
    }
}

        async function register(userData) {
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم إنشاء الحساب بنجاح', 'success');
                    showLoginForm();
                } else {
                    Swal.fire('خطأ', data.error || 'حدث خطأ أثناء إنشاء الحساب', 'error');
                }
            } catch (err) {
                console.error('Registration error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء محاولة إنشاء الحساب', 'error');
            }
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            currentUser = null;
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('loginForm').reset();
        }

        function getRoleName(role) {
            const roles = {
                'admin': 'مدير النظام',
                'secretary': 'سكرتير',
                'accountant': 'محاسب',
                'teacher': 'أستاذ'
            };
            return roles[role] || role;
        }

        function showLoginForm() {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('register-section').style.display = 'none';
        }

        function showRegisterForm() {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('register-section').style.display = 'block';
        }

        function getAuthHeaders() {
            const token = localStorage.getItem('token');
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'credentials': 'include'  // Add this line
            };
        }

        // Check authentication on page load
        function checkAuth() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (token && user) {
                currentUser = user;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
                document.getElementById('user-name').textContent = currentUser.fullName || currentUser.username;
                document.getElementById('user-role').textContent = getRoleName(currentUser.role);
                initApp();
            } else {
                document.getElementById('login-section').style.display = 'block';
                document.getElementById('main-app').style.display = 'none';
            }
        }

        // Initialize the application
        function initApp() {
            // Load initial data
            loadStudents();
            loadTeachers();
            loadClasses();
            loadClassrooms();
            loadStudentsForPayments();
            loadClassesForPayments();
            loadMonthsForPayments();
            loadStudentsForCards();
            loadCards();
            loadClassroomsForClassModal();
            loadTeachersForClassModal();
            
            // Set today's date as default registration date
            document.getElementById('registrationDate').value = new Date().toISOString().split('T')[0];
            
            // Initialize modals
            const modalElements = document.querySelectorAll('.modal');
            modalElements.forEach(modalEl => {
                new bootstrap.Modal(modalEl);
            });
            
            // Initialize tooltips
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(tooltipTriggerEl => {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }

        // Navigation between sections
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Hide all sections
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Remove active from all links
                document.querySelectorAll('.nav-link').forEach(navLink => {
                    navLink.classList.remove('active');
                });
                
                // Activate current link
                this.classList.add('active');
                
                // Show requested section
                const sectionId = this.getAttribute('data-section');
                document.getElementById(sectionId).classList.add('active');
                
                // Load data when needed
                if (sectionId === 'students') loadStudents();
                else if (sectionId === 'teachers') loadTeachers();
                else if (sectionId === 'classes') loadClasses();
                else if (sectionId === 'classrooms') loadClassrooms();
                else if (sectionId === 'payments') {
                    loadStudentsForPayments();
                    loadPayments();
                }
                else if (sectionId === 'cards') {
                    loadStudentsForCards();
                    loadCards();
                }
            });
        });

        // Event listeners
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            login(username, password);
        });

        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                Swal.fire('خطأ', 'كلمة المرور وتأكيدها غير متطابقين', 'error');
                return;
            }
            
            const userData = {
                username: document.getElementById('regUsername').value,
                password: password,
                role: document.getElementById('role').value,
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value
            };
            
            register(userData);
        });

        document.getElementById('show-register').addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });

        document.getElementById('logoutBtn').addEventListener('click', function() {
            logout();
        });

        // Data loading functions (students, teachers, classes, etc.)
        async function loadStudents() {
            try {
                const response = await fetch('/api/students', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const students = await response.json();
                
                const tableBody = document.getElementById('studentsTable');
                tableBody.innerHTML = '';
                
                students.forEach((student, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${student.name}</td>
                        <td>${student.studentId}</td>
                        <td>${student.parentName || '-'}</td>
                        <td>${getAcademicYearName(student.academicYear) || '-'}</td>
                        <td>${student.classes?.length || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-action" onclick="editStudent('${student._id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteStudent('${student._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success btn-action" onclick="showEnrollModal('${student._id}')">
                                <i class="bi bi-book"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                
                document.getElementById('studentsCount').textContent = students.length;
            } catch (err) {
                console.error('Error loading students:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات الطلاب', 'error');
            }
        }

        async function loadTeachers() {
            try {
                const response = await fetch('/api/teachers', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const teachers = await response.json();
                
                const tableBody = document.getElementById('teachersTable');
                tableBody.innerHTML = '';
                
                teachers.forEach((teacher, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${teacher.name}</td>
                        <td>${teacher.subjects?.join('، ') || '-'}</td>
                        <td>${teacher.phone || '-'}</td>
                        <td>${new Date(teacher.hireDate).toLocaleDateString('ar-EG')}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-action" onclick="editTeacher('${teacher._id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteTeacher('${teacher._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                
                document.getElementById('teachersCount').textContent = teachers.length;
            } catch (err) {
                console.error('Error loading teachers:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات الأساتذة', 'error');
            }
        }

        async function loadClasses() {
            try {
                const response = await fetch('/api/classes', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classes = await response.json();
                
                const tableBody = document.getElementById('classesTable');
                tableBody.innerHTML = '';
                
                classes.forEach((cls, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${cls.name}</td>
                        <td>${cls.subject || '-'}</td>
                        <td>${getAcademicYearName(cls.academicYear) || '-'}</td>
                        <td>${cls.teacher?.name || 'غير معين'}</td>
                        <td>${cls.students?.length || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-action" onclick="editClass('${cls._id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteClass('${cls._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success btn-action" onclick="showClassStudents('${cls._id}')">
                                <i class="bi bi-people"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                
                document.getElementById('classesCount').textContent = classes.length;
            } catch (err) {
                console.error('Error loading classes:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات الحصص', 'error');
            }
        }

        async function loadClassrooms() {
            try {
                const response = await fetch('/api/classrooms', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classrooms = await response.json();
                
                const tableBody = document.getElementById('classroomsTable');
                tableBody.innerHTML = '';
                
                classrooms.forEach((classroom, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${classroom.name}</td>
                        <td>${classroom.capacity || '-'}</td>
                        <td>${classroom.location || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-action" onclick="editClassroom('${classroom._id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteClassroom('${classroom._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } catch (err) {
                console.error('Error loading classrooms:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات القاعات', 'error');
            }
        }

        async function loadStudentsForPayments() {
            try {
                const response = await fetch('/api/students', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const students = await response.json();
                
                const select = document.getElementById('paymentStudentSelect');
                select.innerHTML = '<option value="" selected disabled>اختر طالب</option>';
                
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student._id;
                    option.textContent = `${student.name} (${student.studentId})`;
                    select.appendChild(option);
                });
            } catch (err) {
                console.error('Error loading students for payments:', err);
            }
        }

        async function loadClassesForPayments() {
            try {
                const response = await fetch('/api/classes', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classes = await response.json();
                
                const select = document.getElementById('paymentClassSelect');
                select.innerHTML = '<option value="" selected disabled>اختر حصة</option>';
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls._id;
                    option.textContent = `${cls.name} (${cls.price} د.ك)`;
                    select.appendChild(option);
                });
            } catch (err) {
                console.error('Error loading classes for payments:', err);
            }
        }

        async function loadMonthsForPayments() {
            const select = document.getElementById('paymentMonthSelect');
            select.innerHTML = '<option value="" selected disabled>اختر شهر</option>';
            
            const currentDate = new Date();
            for (let i = 0; i < 12; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                const monthName = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                
                const option = document.createElement('option');
                option.value = monthStr;
                option.textContent = monthName;
                select.appendChild(option);
            }
        }

        async function loadPayments(studentId = null, classId = null, month = null) {
            try {
                let url = '/api/payments';
                const params = [];
                
                if (studentId) params.push(`student=${studentId}`);
                if (classId) params.push(`class=${classId}`);
                if (month) params.push(`month=${month}`);
                
                if (params.length > 0) {
                    url += `?${params.join('&')}`;
                }
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const payments = await response.json();
                
                const tableBody = document.getElementById('paymentsTable');
                tableBody.innerHTML = '';
                
                payments.forEach((payment, index) => {
                    const row = document.createElement('tr');
                    row.classList.add(`payment-${payment.status}`);
                    
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${payment.student.name} (${payment.student.studentId})</td>
                        <td>${payment.class.name}</td>
                        <td>${payment.month}</td>
                        <td>${payment.amount} د.ك</td>
                        <td>
                            <span class="badge ${payment.status === 'paid' ? 'bg-success' : 
                                             payment.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                ${payment.status === 'paid' ? 'مسدد' : 
                                 payment.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                            </span>
                        </td>
                        <td>${payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('ar-EG') : '-'}</td>
                        <td>
                            <button class="btn btn-sm ${payment.status !== 'paid' ? 'btn-success' : 'btn-secondary'} btn-action" 
                                onclick="showPaymentModal('${payment._id}')" 
                                ${payment.status === 'paid' ? 'disabled' : ''}>
                                <i class="bi bi-cash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } catch (err) {
                console.error('Error loading payments:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات المدفوعات', 'error');
            }
        }

        async function loadStudentsForCards() {
            try {
                const response = await fetch('/api/students', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const students = await response.json();
                
                const select = document.getElementById('cardStudentSelect');
                select.innerHTML = '<option value="" selected disabled>اختر طالب</option>';
                
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student._id;
                    option.textContent = `${student.name} (${student.studentId})`;
                    select.appendChild(option);
                });
            } catch (err) {
                console.error('Error loading students for cards:', err);
            }
        }

        async function loadCards() {
            try {
                const response = await fetch('/api/cards', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const cards = await response.json();
                
                const tableBody = document.getElementById('cardsTable');
                tableBody.innerHTML = '';
                
                cards.forEach((card, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${card.uid}</td>
                        <td>${card.student.name} (${card.student.studentId})</td>
                        <td>${new Date(card.issueDate).toLocaleDateString('ar-EG')}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCard('${card._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } catch (err) {
                console.error('Error loading cards:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات البطاقات', 'error');
            }
        }

        async function loadClassroomsForClassModal() {
            try {
                const response = await fetch('/api/classrooms', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classrooms = await response.json();
                
                const selects = document.querySelectorAll('select[id^="classClassroom"]');
                selects.forEach(select => {
                    select.innerHTML = '<option value="" selected disabled>اختر قاعة</option>';
                    
                    classrooms.forEach(classroom => {
                        const option = document.createElement('option');
                        option.value = classroom._id;
                        option.textContent = `${classroom.name} (${classroom.location || 'غير محدد'})`;
                        select.appendChild(option);
                    });
                });
            } catch (err) {
                console.error('Error loading classrooms for class modal:', err);
            }
        }

        async function loadTeachersForClassModal() {
            try {
                const response = await fetch('/api/teachers', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const teachers = await response.json();
                
                const teacherSelect = document.getElementById('classTeacherSelect');
                teacherSelect.innerHTML = '<option value="" selected disabled>اختر أستاذ</option>';
                
                teachers.forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher._id;
                    option.textContent = `${teacher.name} (${teacher.subjects?.join('، ') || 'بدون تخصص'})`;
                    teacherSelect.appendChild(option);
                });
            } catch (err) {
                console.error('Error loading teachers for class modal:', err);
            }
        }

        // Helper functions
        function getAcademicYearName(code) {
            const years = {
                '1AS': 'الأولى ثانوي',
                '2AS': 'الثانية ثانوي',
                '3AS': 'الثالثة ثانوي',
                '1MS': 'الأولى متوسط',
                '2MS': 'الثانية متوسط',
                '3MS': 'الثالثة متوسط',
                '4MS': 'الرابعة متوسط',
                '5MS': 'الخامسة متوسط'
            };
            return years[code] || code;
        }

        // Form submission handlers
        document.getElementById('saveStudentBtn').addEventListener('click', async () => {
            const studentData = {
                name: document.getElementById('studentName').value,
                studentId: document.getElementById('studentId').value,
                birthDate: document.getElementById('birthDate').value,
                parentName: document.getElementById('parentName').value,
                parentPhone: document.getElementById('parentPhone').value,
                academicYear: document.getElementById('academicYear').value,
                registrationDate: document.getElementById('registrationDate').value || new Date()
            };
            
            try {
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(studentData)
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم إضافة الطالب بنجاح', 'success');
                    document.getElementById('addStudentForm').reset();
                    bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
                    loadStudents();
                    loadStudentsForPayments();
                    loadStudentsForCards();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء إضافة الطالب', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('saveTeacherBtn').addEventListener('click', async () => {
            const teacherData = {
                name: document.getElementById('teacherName').value,
                subjects: Array.from(document.getElementById('teacherSubjects').selectedOptions).map(opt => opt.value),
                phone: document.getElementById('teacherPhone').value,
                email: document.getElementById('teacherEmail').value
            };
            
            try {
                const response = await fetch('/api/teachers', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(teacherData)
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم إضافة الأستاذ بنجاح', 'success');
                    document.getElementById('addTeacherForm').reset();
                    bootstrap.Modal.getInstance(document.getElementById('addTeacherModal')).hide();
                    loadTeachers();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء إضافة الأستاذ', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('saveClassroomBtn').addEventListener('click', async () => {
            const classroomData = {
                name: document.getElementById('classroomName').value,
                capacity: document.getElementById('classroomCapacity').value,
                location: document.getElementById('classroomLocation').value
            };
            
            try {
                const response = await fetch('/api/classrooms', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(classroomData)
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم إضافة القاعة بنجاح', 'success');
                    document.getElementById('addClassroomForm').reset();
                    bootstrap.Modal.getInstance(document.getElementById('addClassroomModal')).hide();
                    loadClassrooms();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء إضافة القاعة', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('saveClassBtn').addEventListener('click', async () => {
            // Collect schedule data
            const schedules = [];
            const scheduleItems = document.querySelectorAll('.schedule-item');
            
            scheduleItems.forEach(item => {
                const day = item.querySelector('select').value;
                const time = item.querySelector('input[type="time"]').value;
                const classroom = item.querySelectorAll('select')[1].value;
                
                if (day && time && classroom) {
                    schedules.push({
                        day,
                        time,
                        classroom
                    });
                }
            });
            
            if (schedules.length === 0) {
                Swal.fire('خطأ', 'يجب إضافة جدول حصص واحد على الأقل', 'error');
                return;
            }
            
            const classData = {
                name: document.getElementById('className').value,
                subject: document.getElementById('classSubject').value,
                academicYear: document.getElementById('classAcademicYear').value,
                description: document.getElementById('classDescription').value,
                schedule: schedules,
                price: document.getElementById('classPrice').value,
                teacher: document.getElementById('classTeacherSelect').value
            };
            
            try {
                const response = await fetch('/api/classes', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(classData)
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم إضافة الحصة بنجاح', 'success');
                    document.getElementById('addClassForm').reset();
                    bootstrap.Modal.getInstance(document.getElementById('addClassModal')).hide();
                    loadClasses();
                    loadClassesForPayments();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء إضافة الحصة', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('addScheduleBtn').addEventListener('click', async () => {
            scheduleCounter++;
            const schedulesContainer = document.getElementById('classSchedules');
            
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            scheduleItem.innerHTML = `
                <div class="schedule-item-header">
                    <h6>الحصة ${scheduleCounter}</h6>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeSchedule(this)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="classDay${scheduleCounter}" class="form-label">اليوم</label>
                        <select class="form-select" id="classDay${scheduleCounter}">
                            <option value="السبت">السبت</option>
                            <option value="الأحد">الأحد</option>
                            <option value="الإثنين">الإثنين</option>
                            <option value="الثلاثاء">الثلاثاء</option>
                            <option value="الأربعاء">الأربعاء</option>
                            <option value="الخميس">الخميس</option>
                            <option value="الجمعة">الجمعة</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="classTime${scheduleCounter}" class="form-label">الوقت</label>
                        <input type="time" class="form-control" id="classTime${scheduleCounter}">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="classClassroom${scheduleCounter}" class="form-label">القاعة</label>
                        <select class="form-select" id="classClassroom${scheduleCounter}"></select>
                    </div>
                </div>
            `;
            
            schedulesContainer.appendChild(scheduleItem);
            
            // Load classrooms for the new select
            await loadClassroomsForClassModal();
        });

        document.getElementById('assignCardBtn').addEventListener('click', async () => {
            const studentId = document.getElementById('cardStudentSelect').value;
            const cardUid = document.getElementById('cardUid').value;
            
            if (!studentId || !cardUid) {
                Swal.fire('خطأ', 'يجب اختيار طالب ومسح البطاقة', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/cards', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        uid: cardUid,
                        student: studentId
                    })
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    Swal.fire('نجاح', 'تم تعيين البطاقة للطالب بنجاح', 'success');
                    document.getElementById('cardUid').value = '';
                    loadCards();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تعيين البطاقة', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('savePaymentBtn').addEventListener('click', async () => {
            if (!currentPayment) return;
            
            const paymentData = {
                amount: document.getElementById('paymentAmount').value,
                paymentDate: document.getElementById('paymentDate').value,
                paymentMethod: document.getElementById('paymentMethod').value,
                status: 'paid'
            };
            
            try {
                const response = await fetch(`/api/payments/${currentPayment._id}/pay`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(paymentData)
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    const result = await response.json();
                    Swal.fire('نجاح', result.message, 'success');
                    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                    loadPayments();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تسجيل الدفعة', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        document.getElementById('enrollStudentBtn').addEventListener('click', async () => {
            const classId = document.getElementById('enrollClassSelect').value;
            const studentId = document.getElementById('enrollStudentSelect').value;
            
            if (!classId || !studentId) {
                Swal.fire('خطأ', 'يجب اختيار حصة وطالب', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/api/classes/${classId}/enroll/${studentId}`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                if (response.ok) {
                    const result = await response.json();
                    
                    // Show generated payments
                    const paymentsHtml = result.payments.map(payment => `
                        <tr class="${payment.status === 'paid' ? 'table-success' : 
                                     payment.status === 'pending' ? 'table-warning' : 'table-danger'}">
                            <td>${payment.month}</td>
                            <td>${payment.amount} د.ك</td>
                            <td>
                                <span class="badge ${payment.status === 'paid' ? 'bg-success' : 
                                                 payment.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                    ${payment.status === 'paid' ? 'مسدد' : 
                                     payment.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                                </span>
                            </td>
                        </tr>
                    `).join('');
                    
                    Swal.fire({
                        title: 'تمت العملية بنجاح',
                        html: `
                            <p>${result.message}</p>
                            <h5 class="mt-3">الدفعات الشهرية:</h5>
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>الشهر</th>
                                            <th>المبلغ</th>
                                            <th>الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>${paymentsHtml}</tbody>
                                </table>
                            </div>
                        `,
                        icon: 'success'
                    });
                    
                    bootstrap.Modal.getInstance(document.getElementById('enrollStudentModal')).hide();
                    loadClasses();
                    loadStudents();
                } else {
                    const error = await response.json();
                    Swal.fire('خطأ', error.error || 'حدث خطأ أثناء إضافة الطالب للحصة', 'error');
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
            }
        });

        // When student selection changes in payments section
        document.getElementById('paymentStudentSelect').addEventListener('change', function() {
            loadPayments(this.value, 
                        document.getElementById('paymentClassSelect').value,
                        document.getElementById('paymentMonthSelect').value);
        });

        // When class selection changes in payments section
        document.getElementById('paymentClassSelect').addEventListener('change', function() {
            loadPayments(document.getElementById('paymentStudentSelect').value,
                        this.value,
                        document.getElementById('paymentMonthSelect').value);
        });

        // When month selection changes in payments section
        document.getElementById('paymentMonthSelect').addEventListener('change', function() {
            loadPayments(document.getElementById('paymentStudentSelect').value,
                        document.getElementById('paymentClassSelect').value,
                        this.value);
        });

        // Global functions
        window.removeSchedule = function(button) {
            const scheduleItem = button.closest('.schedule-item');
            scheduleItem.remove();
            scheduleCounter--;
            
            // Renumber remaining schedule items
            const remainingItems = document.querySelectorAll('.schedule-item');
            remainingItems.forEach((item, index) => {
                item.querySelector('h6').textContent = `الحصة ${index + 1}`;
            });
        };

window.showPaymentModal = async function(paymentId) {
    try {
        const response = await fetch(`/api/payments/${paymentId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch payment');
        }
        
        const payment = await response.json();
        console.log('Payment data:', payment);
        
        if (!payment) {
            throw new Error('Payment data not found');
        }
        
        // Make sure these elements exist in your HTML
        document.getElementById('paymentStudentName').value = payment.student?.name || 'Unknown';
        document.getElementById('paymentClassName').value = payment.class?.name || 'Unknown';
        document.getElementById('paymentMonth').value = payment.month || '';
        document.getElementById('paymentAmount').value = payment.amount || '';
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        
        currentPayment = payment;
        
        const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        paymentModal.show();
    } catch (err) {
        console.error('Payment modal error:', err);
        Swal.fire('Error', 'Failed to load payment data: ' + err.message, 'error');
    }
};        window.showEnrollModal = async function(studentId) {
            currentStudentId = studentId;
            
            try {
                // Load available classes
                const response = await fetch('/api/classes', {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classes = await response.json();
                
                const select = document.getElementById('enrollClassSelect');
                select.innerHTML = '<option value="" selected disabled>اختر حصة</option>';
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls._id;
                    option.textContent = `${cls.name} (${cls.subject})`;
                    select.appendChild(option);
                });
                
                // Set selected student
                const studentResponse = await fetch(`/api/students/${studentId}`, {
                    headers: getAuthHeaders()
                });
                
                if (studentResponse.status === 401) {
                    logout();
                    return;
                }
                
                const student = await studentResponse.json();
                
                document.getElementById('enrollStudentSelect').innerHTML = `
                    <option value="${student._id}" selected>${student.name} (${student.studentId})</option>
                `;
                
                const enrollModal = new bootstrap.Modal(document.getElementById('enrollStudentModal'));
                enrollModal.show();
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء تحميل بيانات الحصص', 'error');
            }
        };

        window.showAssignCardModal = function(uid) {
            document.getElementById('cardUid').value = uid;
            document.getElementById('cards-link').click();
            document.getElementById('cardStudentSelect').focus();
        };

window.showClassStudents = async function(classId) {
    try {
        // Show loading animation
        Swal.fire({
            title: 'جاري التحميل...',
            html: '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>',
            allowOutsideClick: false,
            showConfirmButton: false
        });

        // Ensure classId is a string
        classId = typeof classId === 'object' ? classId._id : classId;
        
        // Fetch class data
        const classResponse = await fetch(`/api/classes/${classId}`, {
            headers: getAuthHeaders()
        });
        
        if (classResponse.status === 401) {
            Swal.close();
            logout();
            return;
        }
        
        const classObj = await classResponse.json();
        
        // Fetch students data
        const students = await Promise.all(
            classObj.students.map(studentId => {
                const id = typeof studentId === 'object' ? studentId._id : studentId;
                return fetch(`/api/students/${id}`, {
                    headers: getAuthHeaders()
                }).then(res => res.json())
            })
        );
        
        // Fetch payments data
        const paymentsResponse = await fetch(`/api/payments?class=${classId}`, {
            headers: getAuthHeaders()
        });
        
        if (paymentsResponse.status === 401) {
            Swal.close();
            logout();
            return;
        }
        
        const payments = await paymentsResponse.json();

        // Create HTML template with enhanced styling
        const studentsHtml = `
            <style>
                .student-management-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .class-header {
                    background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
                    color: white;
                    padding: 1.5rem;
                    border-radius: 10px;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .student-card {
                    border: none;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                    margin-bottom: 1.5rem;
                    transition: all 0.3s ease;
                    overflow: hidden;
                }
                .student-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
                }
                .student-card .card-header {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    padding: 1rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .student-card .card-body {
                    padding: 1.5rem;
                }
                .student-info {
                    margin-bottom: 1rem;
                }
                .parent-info {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    color: #555;
                }
                .parent-info i {
                    margin-left: 0.5rem;
                }
                .payment-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .payment-table th {
                    background-color: #f8f9fa;
                    padding: 0.75rem;
                    text-align: right;
                    font-weight: 600;
                    color: #495057;
                }
                .payment-table td {
                    padding: 0.75rem;
                    vertical-align: middle;
                    border-bottom: 1px solid #eee;
                }
                .badge-paid {
                    background-color: #28a745;
                    color: white;
                }
                .badge-pending {
                    background-color: #ffc107;
                    color: #212529;
                }
                .badge-late {
                    background-color: #dc3545;
                    color: white;
                }
                .action-btn {
                    transition: all 0.2s ease;
                    border-radius: 50px;
                    padding: 0.35rem 0.75rem;
                    font-size: 0.875rem;
                }
                .unroll-btn {
                    background-color: #dc3545;
                    border-color: #dc3545;
                }
                .unroll-btn:hover {
                    background-color: #c82333;
                    border-color: #bd2130;
                }
                .payment-btn {
                    background-color: #28a745;
                    border-color: #28a745;
                }
                .payment-btn:hover {
                    background-color: #218838;
                    border-color: #1e7e34;
                }
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: #6c757d;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                }
                .empty-state i {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    color: #dee2e6;
                }
                .enroll-btn {
                    background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
                    border: none;
                }
                .enroll-btn:hover {
                    background: linear-gradient(135deg, #3a56a0 0%, #121f3d 100%);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .student-item {
                    animation: fadeIn 0.4s ease forwards;
                    opacity: 0;
                }
            </style>
            
            <div class="student-management-container">
                <div class="class-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-1">${classObj.name}</h3>
                            <p class="mb-0">${classObj.subject} - ${getAcademicYearName(classObj.academicYear)}</p>
                        </div>
                        <button class="btn enroll-btn" onclick="showEnrollStudentModal('${classId}')">
                            <i class="bi bi-plus-lg"></i> تسجيل طالب جديد
                        </button>
                    </div>
                </div>
                
                ${students.length > 0 ? students.map((student, index) => {
                    const studentPayments = payments.filter(p => p.student && p.student._id === student._id);
                    
                    return `
                        <div class="student-item" style="animation-delay: ${index * 0.1}s">
                            <div class="student-card card">
                                <div class="card-header">
                                    <h5 class="mb-0">${student.name} <small class="text-muted">(${student.studentId})</small></h5>
                                    <button class="btn btn-sm unroll-btn action-btn" onclick="unenrollStudent('${classId}', '${student._id}')">
                                        <i class="bi bi-trash"></i> إزالة من الحصة
                                    </button>
                                </div>
                                <div class="card-body">
                                    <div class="student-info">
                                        <div class="parent-info">
                                            <i class="bi bi-person-badge"></i>
                                            <span>ولي الأمر: ${student.parentName || 'غير مسجل'}</span>
                                        </div>
                                        <div class="parent-info">
                                            <i class="bi bi-telephone"></i>
                                            <span>${student.parentPhone || 'غير مسجل'}</span>
                                        </div>
                                    </div>
                                    
                                    <h6 class="mt-4 mb-3 text-muted">حالة المدفوعات:</h6>
                                    
                                    ${studentPayments.length > 0 ? `
                                        <div class="table-responsive">
                                            <table class="payment-table">
                                                <thead>
                                                    <tr>
                                                        <th>إجراء</th>
                                                        <th>الحالة</th>
                                                        <th>المبلغ</th>
                                                        <th>الشهر</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${studentPayments.map(payment => `
                                                        <tr>
                                                            <td>
                                                                <button class="btn btn-sm ${payment.status !== 'paid' ? 'payment-btn' : 'btn-secondary'} action-btn" 
                                                                    onclick="showPaymentModal('${payment._id}')" 
                                                                    ${payment.status === 'paid' ? 'disabled' : ''}>
                                                                    <i class="bi ${payment.status !== 'paid' ? 'bi-cash' : 'bi-check2'}"></i>
                                                                    ${payment.status !== 'paid' ? 'تسديد' : 'مسدد'}
                                                                </button>
                                                            </td>
                                                            <td>
                                                                <span class="badge ${payment.status === 'paid' ? 'badge-paid' : 
                                                                                     payment.status === 'pending' ? 'badge-pending' : 'badge-late'}">
                                                                    ${payment.status === 'paid' ? 'مسدد' : 
                                                                     payment.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                                                                </span>
                                                            </td>
                                                            <td>${payment.amount} د.ك</td>
                                                            <td>${payment.month}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : `
                                        <div class="empty-state">
                                            <i class="bi bi-wallet2"></i>
                                            <p>لا توجد مدفوعات مسجلة لهذا الطالب</p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div class="empty-state">
                        <i class="bi bi-people"></i>
                        <h5>لا يوجد طلاب مسجلين في هذه الحصة</h5>
                        <p>يمكنك تسجيل طلاب جديدين باستخدام زر "تسجيل طالب جديد" بالأعلى</p>
                    </div>
                `}
            </div>
        `;
        
        // Show the modal with all student data
        Swal.fire({
            title: `إدارة طلاب الحصة`,
            html: studentsHtml,
            width: '900px',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                popup: 'animate__animated animate__fadeInUp'
            },
            willOpen: () => {
                // Add animation to student items after they're rendered
                setTimeout(() => {
                    const items = document.querySelectorAll('.student-item');
                    items.forEach(item => {
                        item.style.opacity = '1';
                    });
                }, 100);
            }
        });

    } catch (err) {
        console.error('Error:', err);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء جلب بيانات الطلاب',
            confirmButtonText: 'حسناً',
            customClass: {
                popup: 'animate__animated animate__headShake'
            }
        });
    }
};

// Helper function to show payment modal
window.showPaymentModal = async function(paymentId) {
    try {
        const paymentResponse = await fetch(`/api/payments/${paymentId}`, {
            headers: getAuthHeaders()
        });
        
        if (paymentResponse.status === 401) {
            logout();
            return;
        }
        
        const payment = await paymentResponse.json();
        
        const { value: formValues } = await Swal.fire({
            title: 'تسديد الدفعة',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label">الطالب:</label>
                        <input type="text" class="form-control" value="${payment.student.name}" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">الحصة:</label>
                        <input type="text" class="form-control" value="${payment.class.name}" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">الشهر:</label>
                        <input type="text" class="form-control" value="${payment.month}" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المبلغ:</label>
                        <input type="text" class="form-control" value="${payment.amount} د.ك" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">تاريخ الدفع:</label>
                        <input type="date" id="payment-date" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">طريقة الدفع:</label>
                        <select id="payment-method" class="form-select" required>
                            <option value="cash">نقدي</option>
                            <option value="bank">حوالة بنكية</option>
                            <option value="online">دفع إلكتروني</option>
                        </select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'تأكيد الدفع',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                return {
                    paymentDate: document.getElementById('payment-date').value,
                    paymentMethod: document.getElementById('payment-method').value
                };
            }
        });
        
        if (formValues) {
            // Set default payment date to today if not provided
            if (!formValues.paymentDate) {
                formValues.paymentDate = new Date().toISOString().split('T')[0];
            }
            
            const response = await fetch(`/api/payments/${paymentId}/pay`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formValues)
            });
            
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'تم التسديد بنجاح',
                    text: 'تم تسجيل الدفعة بنجاح',
                    confirmButtonText: 'حسناً'
                });
                
                // Refresh the students view
                showClassStudents(payment.class._id);
            } else {
                throw new Error('فشل في تسجيل الدفعة');
            }
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء محاولة تسجيل الدفعة',
            confirmButtonText: 'حسناً'
        });
    }
};

// Helper function to show student enrollment modal
window.showEnrollStudentModal = async function(classId) {
    try {
        // Fetch all students not already enrolled in this class
        const response = await fetch(`/api/students`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        const allStudents = await response.json();
        
        // Get current class to filter students by academic year
        const classResponse = await fetch(`/api/classes/${classId}`, {
            headers: getAuthHeaders()
        });
        
        if (classResponse.status === 401) {
            logout();
            return;
        }
        
        const classObj = await classResponse.json();
        
        // Filter students by academic year and those not already enrolled
        const availableStudents = allStudents.filter(student => 
            student.academicYear === classObj.academicYear && 
            !classObj.students.includes(student._id)
        );
        
        if (availableStudents.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'لا يوجد طلاب متاحين',
                text: 'لا يوجد طلاب غير مسجلين في هذه الحصة من نفس السنة الدراسية',
                confirmButtonText: 'حسناً'
            });
            return;
        }
        
        const { value: studentId } = await Swal.fire({
            title: 'تسجيل طالب جديد',
            input: 'select',
            inputOptions: availableStudents.reduce((options, student) => {
                options[student._id] = `${student.name} (${student.studentId})`;
                return options;
            }, {}),
            inputPlaceholder: 'اختر الطالب',
            showCancelButton: true,
            confirmButtonText: 'تسجيل',
            cancelButtonText: 'إلغاء',
            inputValidator: (value) => {
                if (!value) {
                    return 'يجب اختيار طالب';
                }
            }
        });
        
        if (studentId) {
            // Enroll the student
            const enrollResponse = await fetch(`/api/classes/${classId}/enroll/${studentId}`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (enrollResponse.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'تم التسجيل بنجاح',
                    text: 'تم تسجيل الطالب في الحصة بنجاح',
                    confirmButtonText: 'حسناً'
                });
                
                // Refresh the students view
                showClassStudents(classId);
            } else {
                throw new Error('فشل في تسجيل الطالب');
            }
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء محاولة تسجيل الطالب',
            confirmButtonText: 'حسناً'
        });
    }
};

// Helper function to unenroll student
window.unenrollStudent = async function(classId, studentId) {
    try {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "سيتم إزالة الطالب من هذه الحصة وجميع المدفوعات المرتبطة بها",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، إزالة',
            cancelButtonText: 'إلغاء'
        });
        
        if (result.isConfirmed) {
            const response = await fetch(`/api/classes/${classId}/unenroll/${studentId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'تمت الإزالة',
                    text: 'تم إزالة الطالب من الحصة بنجاح',
                    confirmButtonText: 'حسناً'
                });
                
                // Refresh the students view
                showClassStudents(classId);
            } else {
                throw new Error('فشل في إزالة الطالب');
            }
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء محاولة إزالة الطالب',
            confirmButtonText: 'حسناً'
        });
    }
};
        window.unenrollStudent = async function(classId, studentId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم إزالة الطالب من الحصة وحذف مدفوعاته',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، إزالة',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/classes/${classId}/unenroll/${studentId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم إزالة الطالب من الحصة بنجاح', 'success');
                        showClassStudents(classId);
                        loadClasses();
                        loadStudents();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء إزالة الطالب', 'error');
            }
        };

        window.editStudent = async function(studentId) {
            try {
                const response = await fetch(`/api/students/${studentId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const student = await response.json();
                
                // Fill the form with student data
                document.getElementById('studentName').value = student.name;
                document.getElementById('studentId').value = student.studentId;
                document.getElementById('birthDate').value = student.birthDate ? student.birthDate.split('T')[0] : '';
                document.getElementById('parentName').value = student.parentName || '';
                document.getElementById('parentPhone').value = student.parentPhone || '';
                document.getElementById('academicYear').value = student.academicYear || '';
                document.getElementById('registrationDate').value = student.registrationDate ? student.registrationDate.split('T')[0] : '';
                
                // Change the save button to update
                const saveBtn = document.getElementById('saveStudentBtn');
                saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>تحديث الطالب';
                saveBtn.onclick = async function() {
                    const studentData = {
                        name: document.getElementById('studentName').value,
                        studentId: document.getElementById('studentId').value,
                        birthDate: document.getElementById('birthDate').value,
                        parentName: document.getElementById('parentName').value,
                        parentPhone: document.getElementById('parentPhone').value,
                        academicYear: document.getElementById('academicYear').value,
                        registrationDate: document.getElementById('registrationDate').value || new Date()
                    };
                    
                    try {
                        const updateResponse = await fetch(`/api/students/${studentId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(studentData)
                        });
                        
                        if (updateResponse.status === 401) {
                            logout();
                            return;
                        }
                        
                        if (updateResponse.ok) {
                            Swal.fire('نجاح', 'تم تحديث الطالب بنجاح', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
                            loadStudents();
                            loadStudentsForPayments();
                            loadStudentsForCards();
                        } else {
                            const error = await updateResponse.json();
                            Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تحديث الطالب', 'error');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                        Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
                    }
                };
                
                // Show the modal
                const studentModal = new bootstrap.Modal(document.getElementById('addStudentModal'));
                studentModal.show();
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات الطالب', 'error');
            }
        };

        window.deleteStudent = async function(studentId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم حذف الطالب وكل بياناته المرتبطة',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، احذف',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/students/${studentId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم حذف الطالب بنجاح', 'success');
                        loadStudents();
                        loadStudentsForPayments();
                        loadStudentsForCards();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء حذف الطالب', 'error');
            }
        };

        window.editTeacher = async function(teacherId) {
            try {
                const response = await fetch(`/api/teachers/${teacherId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const teacher = await response.json();
                
                // Fill the form with teacher data
                document.getElementById('teacherName').value = teacher.name;
                
                // Select subjects
                const subjectSelect = document.getElementById('teacherSubjects');
                Array.from(subjectSelect.options).forEach(option => {
                    option.selected = teacher.subjects?.includes(option.value) || false;
                });
                
                document.getElementById('teacherPhone').value = teacher.phone || '';
                document.getElementById('teacherEmail').value = teacher.email || '';
                
                // Change the save button to update
                const saveBtn = document.getElementById('saveTeacherBtn');
                saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>تحديث الأستاذ';
                saveBtn.onclick = async function() {
                    const teacherData = {
                        name: document.getElementById('teacherName').value,
                        subjects: Array.from(document.getElementById('teacherSubjects').selectedOptions).map(opt => opt.value),
                        phone: document.getElementById('teacherPhone').value,
                        email: document.getElementById('teacherEmail').value
                    };
                    
                    try {
                        const updateResponse = await fetch(`/api/teachers/${teacherId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(teacherData)
                        });
                        
                        if (updateResponse.status === 401) {
                            logout();
                            return;
                        }
                        
                        if (updateResponse.ok) {
                            Swal.fire('نجاح', 'تم تحديث الأستاذ بنجاح', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addTeacherModal')).hide();
                            loadTeachers();
                        } else {
                            const error = await updateResponse.json();
                            Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تحديث الأستاذ', 'error');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                        Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
                    }
                };
                
                // Show the modal
                const teacherModal = new bootstrap.Modal(document.getElementById('addTeacherModal'));
                teacherModal.show();
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات الأستاذ', 'error');
            }
        };

        window.deleteTeacher = async function(teacherId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم حذف الأستاذ وكل بياناته المرتبطة',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، احذف',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/teachers/${teacherId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم حذف الأستاذ بنجاح', 'success');
                        loadTeachers();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء حذف الأستاذ', 'error');
            }
        };

        window.editClass = async function(classId) {
            try {
                const response = await fetch(`/api/classes/${classId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classObj = await response.json();
                
                // Fill the form with class data
                document.getElementById('className').value = classObj.name;
                document.getElementById('classSubject').value = classObj.subject || '';
                document.getElementById('classAcademicYear').value = classObj.academicYear || '';
                document.getElementById('classDescription').value = classObj.description || '';
                document.getElementById('classPrice').value = classObj.price;
                document.getElementById('classTeacherSelect').value = classObj.teacher?._id || '';
                
                // Clear existing schedules
                const schedulesContainer = document.getElementById('classSchedules');
                schedulesContainer.innerHTML = '';
                scheduleCounter = 0;
                
                // Add schedules
                if (classObj.schedule && classObj.schedule.length > 0) {
                    classObj.schedule.forEach((schedule, index) => {
                        scheduleCounter++;
                        const scheduleItem = document.createElement('div');
                        scheduleItem.className = 'schedule-item';
                        scheduleItem.innerHTML = `
                            <div class="schedule-item-header">
                                <h6>الحصة ${scheduleCounter}</h6>
                                <button type="button" class="btn btn-sm btn-danger" onclick="removeSchedule(this)">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="classDay${scheduleCounter}" class="form-label">اليوم</label>
                                    <select class="form-select" id="classDay${scheduleCounter}">
                                        <option value="السبت" ${schedule.day === 'السبت' ? 'selected' : ''}>السبت</option>
                                        <option value="الأحد" ${schedule.day === 'الأحد' ? 'selected' : ''}>الأحد</option>
                                        <option value="الإثنين" ${schedule.day === 'الإثنين' ? 'selected' : ''}>الإثنين</option>
                                        <option value="الثلاثاء" ${schedule.day === 'الثلاثاء' ? 'selected' : ''}>الثلاثاء</option>
                                        <option value="الأربعاء" ${schedule.day === 'الأربعاء' ? 'selected' : ''}>الأربعاء</option>
                                        <option value="الخميس" ${schedule.day === 'الخميس' ? 'selected' : ''}>الخميس</option>
                                        <option value="الجمعة" ${schedule.day === 'الجمعة' ? 'selected' : ''}>الجمعة</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="classTime${scheduleCounter}" class="form-label">الوقت</label>
                                    <input type="time" class="form-control" id="classTime${scheduleCounter}" value="${schedule.time}">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="classClassroom${scheduleCounter}" class="form-label">القاعة</label>
                                    <select class="form-select" id="classClassroom${scheduleCounter}"></select>
                                </div>
                            </div>
                        `;
                        schedulesContainer.appendChild(scheduleItem);
                    });
                    
                    // Load classrooms for each schedule
                    await loadClassroomsForClassModal();
                    
                    // Set the classroom values after the selects are populated
                    classObj.schedule.forEach((schedule, index) => {
                        const classroomSelect = document.getElementById(`classClassroom${index + 1}`);
                        if (classroomSelect) {
                            classroomSelect.value = schedule.classroom;
                        }
                    });
                } else {
                    // Add one empty schedule if none exist
                    scheduleCounter++;
                    const scheduleItem = document.createElement('div');
                    scheduleItem.className = 'schedule-item';
                    scheduleItem.innerHTML = `
                        <div class="schedule-item-header">
                            <h6>الحصة 1</h6>
                            <button type="button" class="btn btn-sm btn-danger" onclick="removeSchedule(this)">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="classDay1" class="form-label">اليوم</label>
                                <select class="form-select" id="classDay1">
                                    <option value="السبت">السبت</option>
                                    <option value="الأحد">الأحد</option>
                                    <option value="الإثنين">الإثنين</option>
                                    <option value="الثلاثاء">الثلاثاء</option>
                                    <option value="الأربعاء">الأربعاء</option>
                                    <option value="الخميس">الخميس</option>
                                    <option value="الجمعة">الجمعة</option>
                                </select>
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="classTime1" class="form-label">الوقت</label>
                                <input type="time" class="form-control" id="classTime1">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="classClassroom1" class="form-label">القاعة</label>
                                <select class="form-select" id="classClassroom1"></select>
                            </div>
                        </div>
                    `;
                    schedulesContainer.appendChild(scheduleItem);
                    
                    // Load classrooms for the new schedule
                    await loadClassroomsForClassModal();
                }
                
                // Change the save button to update
                const saveBtn = document.getElementById('saveClassBtn');
                saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>تحديث الحصة';
                saveBtn.onclick = async function() {
                    // Collect schedule data
                    const schedules = [];
                    const scheduleItems = document.querySelectorAll('.schedule-item');
                    
                    scheduleItems.forEach(item => {
                        const day = item.querySelector('select').value;
                        const time = item.querySelector('input[type="time"]').value;
                        const classroom = item.querySelectorAll('select')[1].value;
                        
                        if (day && time && classroom) {
                            schedules.push({
                                day,
                                time,
                                classroom
                            });
                        }
                    });
                    
                    if (schedules.length === 0) {
                        Swal.fire('خطأ', 'يجب إضافة جدول حصص واحد على الأقل', 'error');
                        return;
                    }
                    
                    const classData = {
                        name: document.getElementById('className').value,
                        subject: document.getElementById('classSubject').value,
                        academicYear: document.getElementById('classAcademicYear').value,
                        description: document.getElementById('classDescription').value,
                        schedule: schedules,
                        price: document.getElementById('classPrice').value,
                        teacher: document.getElementById('classTeacherSelect').value
                    };
                    
                    try {
                        const updateResponse = await fetch(`/api/classes/${classId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(classData)
                        });
                        
                        if (updateResponse.status === 401) {
                            logout();
                            return;
                        }
                        
                        if (updateResponse.ok) {
                            Swal.fire('نجاح', 'تم تحديث الحصة بنجاح', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addClassModal')).hide();
                            loadClasses();
                            loadClassesForPayments();
                        } else {
                            const error = await updateResponse.json();
                            Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تحديث الحصة', 'error');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                        Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
                    }
                };
                
                // Show the modal
                const classModal = new bootstrap.Modal(document.getElementById('addClassModal'));
                classModal.show();
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات الحصة', 'error');
            }
        };

        window.deleteClass = async function(classId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم حذف الحصة وكل البيانات المرتبطة بها',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، احذف',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/classes/${classId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم حذف الحصة بنجاح', 'success');
                        loadClasses();
                        loadClassesForPayments();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء حذف الحصة', 'error');
            }
        };

        window.editClassroom = async function(classroomId) {
            try {
                const response = await fetch(`/api/classrooms/${classroomId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 401) {
                    logout();
                    return;
                }
                
                const classroom = await response.json();
                
                // Fill the form with classroom data
                document.getElementById('classroomName').value = classroom.name;
                document.getElementById('classroomCapacity').value = classroom.capacity || '';
                document.getElementById('classroomLocation').value = classroom.location || '';
                
                // Change the save button to update
                const saveBtn = document.getElementById('saveClassroomBtn');
                saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>تحديث القاعة';
                saveBtn.onclick = async function() {
                    const classroomData = {
                        name: document.getElementById('classroomName').value,
                        capacity: document.getElementById('classroomCapacity').value,
                        location: document.getElementById('classroomLocation').value
                    };
                    
                    try {
                        const updateResponse = await fetch(`/api/classrooms/${classroomId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(classroomData)
                        });
                        
                        if (updateResponse.status === 401) {
                            logout();
                            return;
                        }
                        
                        if (updateResponse.ok) {
                            Swal.fire('نجاح', 'تم تحديث القاعة بنجاح', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addClassroomModal')).hide();
                            loadClassrooms();
                        } else {
                            const error = await updateResponse.json();
                            Swal.fire('خطأ', error.error || 'حدث خطأ أثناء تحديث القاعة', 'error');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                        Swal.fire('خطأ', 'حدث خطأ أثناء الاتصال بالخادم', 'error');
                    }
                };
                
                // Show the modal
                const classroomModal = new bootstrap.Modal(document.getElementById('addClassroomModal'));
                classroomModal.show();
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات القاعة', 'error');
            }
        };

        window.deleteClassroom = async function(classroomId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم حذف القاعة وكل البيانات المرتبطة بها',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، احذف',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/classrooms/${classroomId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم حذف القاعة بنجاح', 'success');
                        loadClassrooms();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء حذف القاعة', 'error');
            }
        };

        window.deleteCard = async function(cardId) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: 'سيتم حذف البطاقة ولن يتم التعرف على الطالب عند مسحها',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، احذف',
                    cancelButtonText: 'إلغاء'
                });
                
                if (isConfirmed) {
                    const response = await fetch(`/api/cards/${cardId}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders()
                    });
                    
                    if (response.status === 401) {
                        logout();
                        return;
                    }
                    
                    if (response.ok) {
                        Swal.fire('نجاح', 'تم حذف البطاقة بنجاح', 'success');
                        loadCards();
                    } else {
                        const error = await response.json();
                        Swal.fire('خطأ', error.error, 'error');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
                Swal.fire('خطأ', 'حدث خطأ أثناء حذف البطاقة', 'error');
            }
        };

        // Handle RFID cards
        socket.on('student-detected', (data) => {
            const rfidResult = document.getElementById('rfid-result');
            const student = data.student;
            
            rfidResult.innerHTML = `
                <div class="card w-100">
                    <div class="card-body text-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&size=100" 
                             class="student-photo mb-3">
                        <h4>${student.name}</h4>
                        <p>رقم الطالب: ${student.studentId}</p>
                        <p>ولي الأمر: ${student.parentName || 'غير مسجل'}</p>
                        <p>الهاتف: ${student.parentPhone || 'غير مسجل'}</p>
                        <hr>
                        <h5>الحصص المسجل بها:</h5>
                        <ul class="list-group mb-3">
                            ${data.classes.map(cls => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${cls.name} (${cls.subject})
                                    <span class="badge bg-primary rounded-pill">${cls.price} د.ك</span>
                                </li>
                            `).join('')}
                        </ul>
                        <h5>حالة المدفوعات:</h5>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>الشهر</th>
                                        <th>الحصة</th>
                                        <th>المبلغ</th>
                                        <th>الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.payments.map(payment => `
                                        <tr class="${payment.status === 'paid' ? 'table-success' : 
                                                     payment.status === 'pending' ? 'table-warning' : 'table-danger'}">
                                            <td>${payment.month}</td>
                                            <td>${payment.class.name}</td>
                                            <td>${payment.amount} د.ك</td>
                                            <td>
                                                <span class="badge ${payment.status === 'paid' ? 'bg-success' : 
                                                                     payment.status === 'pending' ? 'bg-warning' : 'bg-danger'}">
                                                    ${payment.status === 'paid' ? 'مسدد' : 
                                                     payment.status === 'pending' ? 'قيد الانتظار' : 'متأخر'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to activity log
            const activityItem = document.createElement('li');
            activityItem.className = 'list-group-item';
            activityItem.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>تم الكشف عن الطالب ${student.name}</span>
                    <small class="text-muted">${new Date().toLocaleTimeString('ar-EG')}</small>
                </div>
            `;
            document.getElementById('recentActivity').prepend(activityItem);
        });

        socket.on('unknown-card', (data) => {
            const rfidResult = document.getElementById('rfid-result');
            rfidResult.innerHTML = `
                <div class="alert alert-warning text-center">
                    <h4>بطاقة غير مسجلة</h4>
                    <p>رقم البطاقة: ${data.uid}</p>
                    <button class="btn btn-primary mt-2" onclick="showAssignCardModal('${data.uid}')">
                        <i class="bi bi-credit-card me-1"></i>تعيين البطاقة لطالب
                    </button>
                </div>
            `;
        });

        socket.on('card-error', (data) => {
            const rfidResult = document.getElementById('rfid-result');
            rfidResult.innerHTML = `
                <div class="alert alert-danger text-center">
                    <h4>حدث خطأ</h4>
                    <p>${data.error}</p>
                </div>
            `;
        });

        // Check authentication on page load
        document.addEventListener('DOMContentLoaded', checkAuth);