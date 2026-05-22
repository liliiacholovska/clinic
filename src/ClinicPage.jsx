import React from 'react';

const API_URL = '/api.php';

const tables = {
  doctors: {
    title: 'Doctors',
    pk: 'DoctorID',
    fields: ['DepartmentID', 'FullName', 'Specialization', 'Phone'],
    guest: ['FullName', 'Specialization'],
    client: ['DoctorID', 'DepartmentName', 'FullName', 'Specialization', 'Phone'],
    admin: ['DoctorID', 'DepartmentID', 'DepartmentName', 'FullName', 'Specialization', 'Phone']
  },

  departments: {
    title: 'Departments',
    pk: 'DepartmentID',
    fields: ['Name', 'Description'],
    guest: ['Name', 'Description'],
    client: ['DepartmentID', 'Name', 'Description'],
    admin: ['DepartmentID', 'Name', 'Description']
  },

  services: {
    title: 'Services',
    pk: 'ServiceID',
    fields: ['Name', 'Price', 'Duration'],
    guest: ['Name', 'Price', 'Duration'],
    client: ['ServiceID', 'Name', 'Price', 'Duration'],
    admin: ['ServiceID', 'Name', 'Price', 'Duration']
  },

  schedule: {
    title: 'Schedule',
    pk: 'ScheduleID',
    fields: ['DoctorID', 'DayOfWeek', 'StartTime', 'EndTime', 'IsAvailable'],
    guest: ['DoctorName', 'Specialization', 'DepartmentName', 'DayOfWeek', 'StartTime', 'EndTime'],
    client: ['ScheduleID', 'DoctorName', 'Specialization', 'DepartmentName', 'DayOfWeek', 'StartTime', 'EndTime', 'IsAvailable'],
    admin: ['ScheduleID', 'DoctorID', 'DoctorName', 'Specialization', 'DepartmentName', 'DayOfWeek', 'StartTime', 'EndTime', 'IsAvailable']
  },

  comments: {
    title: 'Comments',
    pk: 'CommentID',
    fields: ['PatientID', 'DoctorID', 'Text', 'Rating', 'DateTime'],
    clientFields: ['DoctorID', 'Text', 'Rating'],
    guest: ['DoctorName', 'Text', 'Rating'],
    client: ['CommentID', 'DoctorName', 'Text', 'Rating', 'DateTime'],
    admin: ['CommentID', 'PatientID', 'DoctorID', 'PatientName', 'DoctorName', 'Text', 'Rating', 'DateTime']
  },

  appointment: {
    title: 'Appointments',
    pk: 'AppointmentID',
    fields: ['PatientID', 'DoctorID', 'ServiceID', 'Status', 'Reason', 'DateTime'],
    guest: [],
    client: ['AppointmentID', 'PatientName', 'DoctorName', 'ServiceName', 'Status', 'Reason', 'DateTime'],
    admin: ['AppointmentID', 'PatientID', 'DoctorID', 'ServiceID', 'PatientName', 'DoctorName', 'ServiceName', 'Status', 'Reason', 'DateTime']
  },

  diagnosis: {
    title: 'Diagnoses',
    pk: 'DiagnosisID',
    fields: ['AppointmentID', 'DiagnosisText', 'Notes'],
    guest: [],
    client: ['DiagnosisID', 'PatientName', 'DoctorName', 'DiagnosisText', 'Notes'],
    admin: ['DiagnosisID', 'AppointmentID', 'PatientName', 'DoctorName', 'DiagnosisText', 'Notes']
  },

  purpose: {
    title: 'Prescriptions',
    pk: 'PurposeID',
    fields: ['DiagnosisID', 'Medication', 'Dosage', 'Duration'],
    guest: [],
    client: ['PurposeID', 'DiagnosisText', 'Medication', 'Dosage', 'Duration'],
    admin: ['PurposeID', 'DiagnosisID', 'DiagnosisText', 'Medication', 'Dosage', 'Duration']
  },

  payments: {
    title: 'Payments',
    pk: 'PaymentID',
    fields: ['AppointmentID', 'Amount', 'Method', 'PaymentDate'],
    guest: [],
    client: [],
    admin: ['PaymentID', 'AppointmentID', 'PatientName', 'Amount', 'Method', 'PaymentDate']
  },

  patients: {
    title: 'Patients',
    pk: 'PatientID',
    fields: ['FullName', 'BirthDate', 'Phone'],
    guest: [],
    client: [],
    admin: ['PatientID', 'FullName', 'BirthDate', 'Phone']
  },

  users: {
    title: 'Users',
    pk: 'id',
    fields: ['username', 'password', 'role', 'PatientID'],
    guest: [],
    client: [],
    admin: ['id', 'username', 'role', 'PatientID']
  }
};

const dayNames = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun'
};

function formatTime(time) {
  if (!time) return '';
  return String(time).slice(0, 5);
}

function makeSlots(start, end) {
  if (!start || !end) return [];

  const [h, m] = String(start).split(':').map(Number);
  const [endH, endM] = String(end).split(':').map(Number);

  if ([h, m, endH, endM].some(Number.isNaN)) return [];

  const slots = [];
  let current = h * 60 + m;
  const finish = endH * 60 + endM;

  while (current + 60 <= finish) {
    const sh = String(Math.floor(current / 60)).padStart(2, '0');
    const sm = String(current % 60).padStart(2, '0');

    const next = current + 60;
    const eh = String(Math.floor(next / 60)).padStart(2, '0');
    const em = String(next % 60).padStart(2, '0');

    slots.push(`${sh}:${sm}–${eh}:${em}`);
    current = next;
  }

  return slots;
}

function inputType(field) {
  if (field === 'DateTime') return 'datetime-local';
  if (field.includes('Date') || field === 'BirthDate') return 'date';
  if (field.includes('Time')) return 'time';

  if (
    field.includes('ID') ||
    field === 'Price' ||
    field === 'Amount' ||
    field === 'Duration' ||
    field === 'Rating' ||
    field === 'DayOfWeek' ||
    field === 'IsAvailable'
  ) {
    return 'number';
  }

  return 'text';
}

export default function ClinicPage({ initialResource = 'doctors' }) {
  const [user, setUser] = React.useState(() => {
    const savedUser = localStorage.getItem('clinicUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [showAuth, setShowAuth] = React.useState(false);
  const [authMode, setAuthMode] = React.useState('login');
  const [authForm, setAuthForm] = React.useState({
    username: '',
    password: '',
    fullName: ''
  });
  const [authErrors, setAuthErrors] = React.useState({});

  const role = user ? user.role : 'guest';

  const [resource, setResource] = React.useState(initialResource);
  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('');
  const [direction, setDirection] = React.useState('ASC');

  const [addForm, setAddForm] = React.useState({});
  const [editForm, setEditForm] = React.useState({});
  const [editingId, setEditingId] = React.useState(null);

  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState('error');

  const [fieldErrors, setFieldErrors] = React.useState({
    add: {},
    edit: {}
  });

  const [scheduleItems, setScheduleItems] = React.useState([]);
  const [patientsList, setPatientsList] = React.useState([]);
  const [doctorsList, setDoctorsList] = React.useState([]);
  const [servicesList, setServicesList] = React.useState([]);
  const [appointmentsList, setAppointmentsList] = React.useState([]);

  const availableTables = Object.keys(tables).filter(key => {
    return tables[key][role].length > 0;
  });

  const config = tables[resource] || tables.patients;
  const fields = config[role] || [];

  const formFields =
    role === 'client' && resource === 'comments'
      ? config.clientFields
      : config.fields;

  function canEdit() {
    return role === 'admin';
  }

  function canAdd() {
    return role === 'admin' || (role === 'client' && resource === 'comments');
  }

  function authHeaders() {
    const token = localStorage.getItem('clinicToken');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  function showMessage(text, type = 'error') {
    setMessage(text);
    setMessageType(type);
  }

  function apiUrl(params) {
    const token = localStorage.getItem('clinicToken');

    if (token) {
      params.append('token', token);
    }

    return `${API_URL}?${params.toString()}`;
  }

  function clearFieldError(formType, field) {
    setFieldErrors(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [field]: ''
      }
    }));
  }

  function setFieldError(formType, field, text) {
    setFieldErrors(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [field]: text
      }
    }));
  }

  function validateForm(form) {
    const errors = {};

    if (resource === 'appointment') {
      if (!form.PatientID) errors.PatientID = 'Select patient';
      if (!form.DoctorID) errors.DoctorID = 'Select doctor';
      if (!form.ServiceID) errors.ServiceID = 'Select service';
      if (!form.Status) errors.Status = 'Select status';
      if (!form.DateTime) errors.DateTime = 'Select date and time';
    }

    if (resource === 'comments') {
      if (!form.DoctorID) errors.DoctorID = 'Select doctor';
      if (!form.Text?.trim()) errors.Text = 'Comment is required';
      if (!form.Rating) errors.Rating = 'Rating is required';
    }

    if (resource === 'doctors') {
      if (!form.DepartmentID) errors.DepartmentID = 'Department is required';
      if (!form.FullName?.trim()) errors.FullName = 'Full name is required';
      if (!form.Specialization?.trim()) errors.Specialization = 'Specialization is required';
      if (!form.Phone?.trim()) errors.Phone = 'Phone is required';
    }

    if (resource === 'departments') {
      if (!form.Name?.trim()) errors.Name = 'Name is required';
    }

    if (resource === 'services') {
      if (!form.Name?.trim()) errors.Name = 'Name is required';
      if (!form.Price) errors.Price = 'Price is required';
      if (!form.Duration) errors.Duration = 'Duration is required';
    }

    if (resource === 'patients') {
      if (!form.FullName?.trim()) errors.FullName = 'Full name is required';
      if (!form.BirthDate) errors.BirthDate = 'Birth date is required';
      if (!form.Phone?.trim()) errors.Phone = 'Phone is required';
    }

    if (resource === 'schedule') {
      if (!form.DoctorID) errors.DoctorID = 'Doctor is required';
      if (!form.DayOfWeek) errors.DayOfWeek = 'Day is required';
      if (!form.StartTime) errors.StartTime = 'Start time is required';
      if (!form.EndTime) errors.EndTime = 'End time is required';
      if (form.IsAvailable === undefined || form.IsAvailable === '') {
        errors.IsAvailable = 'Availability is required';
      }
    }

    if (resource === 'diagnosis') {
      if (!form.AppointmentID) errors.AppointmentID = 'Appointment is required';
      if (!form.DiagnosisText?.trim()) errors.DiagnosisText = 'Diagnosis is required';
    }

    if (resource === 'purpose') {
      if (!form.DiagnosisID) errors.DiagnosisID = 'Diagnosis is required';
      if (!form.Medication?.trim()) errors.Medication = 'Medication is required';
      if (!form.Dosage?.trim()) errors.Dosage = 'Dosage is required';
      if (!form.Duration?.trim()) errors.Duration = 'Duration is required';
    }

    if (resource === 'payments') {
      if (!form.AppointmentID) errors.AppointmentID = 'Appointment is required';
      if (!form.Amount) errors.Amount = 'Amount is required';
      if (!form.Method) errors.Method = 'Method is required';
      if (!form.PaymentDate) errors.PaymentDate = 'Payment date is required';
    }

    if (resource === 'users') {
      if (!form.username?.trim()) errors.username = 'Username is required';
      if (!form.role) errors.role = 'Role is required';
    }

    return errors;
  }

  function apiErrorToField(error) {
    if (!error) return null;

    const text = String(error).toLowerCase();

    if (text.includes('patient')) return 'PatientID';
    if (text.includes('doctor')) return 'DoctorID';
    if (text.includes('service')) return 'ServiceID';
    if (text.includes('date') || text.includes('time') || text.includes('available')) return 'DateTime';
    if (text.includes('password')) return 'password';
    if (text.includes('username')) return 'username';

    return null;
  }

 async function loadData() {
    setItems([]);

    const params = new URLSearchParams();
    params.append('resource', resource);

    const privateClientTables = [
      'appointment',
      'diagnosis',
      'purpose',
      'comments'
    ];

    if (role === 'client' && privateClientTables.includes(resource)) {
      if (!user?.patientId) {
        setItems([]);
        showMessage('This client account is not linked to a patient');
        return;
      }
    }

    if (search.trim()) {
      params.append('search', search.trim());
    }

    if (sort) {
      params.append('sort', sort);
      params.append('direction', direction);
    }

    try {
      const response = await fetch(apiUrl(params), {
        headers: authHeaders()
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setItems(data);
        setMessage('');
      } else {
        setItems([]);
        showMessage(data.error || 'Data loading error');
      }
    } catch {
      setItems([]);
      showMessage('Cannot connect to API');
    }
  }

  async function loadAppointmentData() {
    try {
  const makeParams = resourceName => {
    const params = new URLSearchParams();
    params.append('resource', resourceName);
    return params;
  };

  const [patientsRes, doctorsRes, servicesRes, scheduleRes, appointmentsRes] =
    await Promise.all([
      fetch(apiUrl(makeParams('patients')), {
        headers: authHeaders()
      }),

      fetch(apiUrl(makeParams('doctors')), {
        headers: authHeaders()
      }),

      fetch(apiUrl(makeParams('services')), {
        headers: authHeaders()
      }),

      fetch(apiUrl(makeParams('schedule')), {
        headers: authHeaders()
      }),

      fetch(apiUrl(makeParams('appointment')), {
        headers: authHeaders()
      })
    ]);

      const patients = await patientsRes.json();
      const doctors = await doctorsRes.json();
      const services = await servicesRes.json();
      const schedule = await scheduleRes.json();
      const appointments = await appointmentsRes.json();

      setPatientsList(Array.isArray(patients) ? patients : []);
      setDoctorsList(Array.isArray(doctors) ? doctors : []);
      setServicesList(Array.isArray(services) ? services : []);
      setScheduleItems(Array.isArray(schedule) ? schedule : []);
      setAppointmentsList(Array.isArray(appointments) ? appointments : []);
    } catch {
      setPatientsList([]);
      setDoctorsList([]);
      setServicesList([]);
      setScheduleItems([]);
      setAppointmentsList([]);
    }
  }

  React.useEffect(() => {
    if (role !== 'admin') {
      setPatientsList([]);
      setAppointmentsList([]);
    }

    if (resource === 'appointment' && role === 'admin') {
      loadAppointmentData();
    }

    if (resource === 'schedule') {
      loadScheduleSupportData();
    }
  }, [resource, role]);

  React.useEffect(() => {
    setItems([]);
    setSearch('');
    setSort('');
    setDirection('ASC');
    setAddForm({});
    setEditForm({});
    setEditingId(null);
    setMessage('');
    setFieldErrors({ add: {}, edit: {} });
  }, [resource]);

  React.useEffect(() => {
    loadData();
  }, [resource, role, user?.patientId]);

 async function login() {
  setAuthErrors({});

  const errors = {};

  if (!authForm.username.trim()) {
    errors.username = 'Enter username';
  }

  if (!authForm.password.trim()) {
    errors.password = 'Enter password';
  }

  if (Object.keys(errors).length > 0) {
    setAuthErrors(errors);
    return;
  }

  try {
    const response = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem('clinicToken', result.token);
      localStorage.setItem('clinicUser', JSON.stringify(result.user));

      setUser(result.user);
      setShowAuth(false);
      setAuthForm({ username: '', password: '', fullName: '' });
      setAuthErrors({});
    } else {
      setAuthErrors({
        username: result.error || 'Login error'
      });
    }
  } catch {
    setAuthErrors({
      username: 'Cannot connect to API'
    });
  }
  }
  
  async function loadScheduleSupportData() {
  const makeParams = resourceName => {
    const params = new URLSearchParams();
    params.append('resource', resourceName);
    return params;
  };

  try {
    const [doctorsRes, servicesRes, scheduleRes, appointmentsRes] =
      await Promise.all([
        fetch(apiUrl(makeParams('doctors')), { headers: authHeaders() }),
        fetch(apiUrl(makeParams('services')), { headers: authHeaders() }),
        fetch(apiUrl(makeParams('schedule')), { headers: authHeaders() }),
        fetch(apiUrl(makeParams('appointment')), { headers: authHeaders() })
      ]);

    const doctors = await doctorsRes.json();
    const services = await servicesRes.json();
    const schedule = await scheduleRes.json();
    const appointments = await appointmentsRes.json();

    console.log('APPOINTMENTS:', appointments);

    setDoctorsList(Array.isArray(doctors) ? doctors : []);
    setServicesList(Array.isArray(services) ? services : []);
    setScheduleItems(Array.isArray(schedule) ? schedule : []);

    if (Array.isArray(appointments)) {
      setAppointmentsList(appointments);
    } else {
      setAppointmentsList([]);
      showMessage(appointments.error || 'Appointments loading error');
    }
  } catch (error) {
    console.error(error);
    setAppointmentsList([]);
    showMessage('Cannot load appointments for schedule');
  }
}

  async function register() {
  setAuthErrors({});

  const errors = {};

  if (!authForm.username.trim()) {
    errors.username = 'Enter username';
  }

  if (!authForm.password.trim()) {
    errors.password = 'Enter password';
  }

  if (!authForm.fullName.trim()) {
    errors.fullName = 'Enter full name';
  }

  if (Object.keys(errors).length > 0) {
    setAuthErrors(errors);
    return;
  }

  try {
    const response = await fetch(`${API_URL}?action=register`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(authForm)
    });

    const result = await response.json();

    if (result.success) {
      setAuthMode('login');
      setAuthForm({ username: '', password: '', fullName: '' });
      setAuthErrors({
        username: 'Registration successful. Now log in.'
      });
    } else {
      setAuthErrors({
        fullName: result.error || 'Registration error'
      });
    }
  } catch {
    setAuthErrors({
      username: 'Cannot connect to API'
    });
  }
}

  function logout() {
    localStorage.removeItem('clinicUser');
    localStorage.removeItem('clinicToken');
    setUser(null);
    setShowAuth(false);
    setResource('doctors');
  }

  async function addItem(e) {
    e.preventDefault();

    setMessage('');
    setFieldErrors(prev => ({ ...prev, add: {} }));

    const errors = validateForm(addForm);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        add: errors
      }));
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}?resource=${resource}`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(addForm)
        }
      );

      const result = await response.json();

      if (result.success) {
        showMessage('Record added successfully', 'success');
        setAddForm({});
        setFieldErrors(prev => ({ ...prev, add: {} }));
        loadData();

        if (resource === 'appointment' || resource === 'schedule') {
          loadAppointmentData();
        }
      } else {
        const field = apiErrorToField(result.error);

        if (field) {
          setFieldError('add', field, result.error);
        } else {
          showMessage(result.error || 'Add error');
        }
      }
    } catch {
      showMessage('Cannot connect to API');
    }
  }

  function startEdit(item) {
    const data = {};

    config.fields.forEach(field => {
      data[field] = item[field] ?? '';
    });

    setEditForm(data);
    setEditingId(item[config.pk]);
    setFieldErrors(prev => ({ ...prev, edit: {} }));
  }

  async function saveEdit(e) {
    e.preventDefault();

    setMessage('');
    setFieldErrors(prev => ({ ...prev, edit: {} }));

    const errors = validateForm(editForm);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        edit: errors
      }));
      return;
    }

    try {
      const response = await fetch(`${API_URL}?resource=${resource}&id=${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Record updated successfully', 'success');
        setEditForm({});
        setEditingId(null);
        setFieldErrors(prev => ({ ...prev, edit: {} }));
        loadData();

        if (resource === 'appointment' || resource === 'schedule') {
          loadAppointmentData();
        }
      } else {
        const field = apiErrorToField(result.error);

        if (field) {
          setFieldError('edit', field, result.error);
        } else {
          showMessage(result.error || 'Edit error');
        }
      }
    } catch {
      showMessage('Cannot connect to API');
    }
  }

  async function removeItem(id) {
    if (!confirm('Delete record?')) return;

    try {
      const response = await fetch(`${API_URL}?resource=${resource}&id=${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Record deleted successfully', 'success');
        loadData();

        if (resource === 'appointment' || resource === 'schedule') {
          loadAppointmentData();
        }
      } else {
        showMessage(result.error || 'Delete error');
      }
    } catch {
      showMessage('Cannot connect to API');
    }
  }

  function getDayOfWeek(dateText) {
  const [y, m, d] = String(dateText).slice(0, 10).split('-').map(Number);

  if (!y || !m || !d) return null;

  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let year = y;

  if (m < 3) year -= 1;

  const day = (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + t[m - 1] + d) % 7;

  return day === 0 ? 7 : day;
}

function isSlotBooked(doctorId, day, slot, doctorName = '') {
  const slotStart = slot.split('–')[0].trim();

  return appointmentsList.some(app => {
    const status = String(app.Status || '').trim().toLowerCase();

    if (status === 'cancelled') return false;

    const sameDoctor =
      String(app.DoctorID || '').trim() === String(doctorId || '').trim() ||
      String(app.DoctorName || '').trim() === String(doctorName || '').trim();

    if (!sameDoctor) return false;

    const dateTime = String(app.DateTime || '').trim();
    const appTime = dateTime.slice(11, 16);
    const appDay = getDayOfWeek(dateTime);

    return Number(appDay) === Number(day) && appTime === slotStart;
  });
}

  function FieldError({ formType, field }) {
    const error = fieldErrors?.[formType]?.[field];

    if (!error) return null;

    return <span className="field-error">{error}</span>;
  }

  function FormFields({ form, setForm, formType }) {
    return formFields.map(field => {
      if (resource === 'appointment' && field === 'PatientID') {
        return (
          <label className="form-field" key={field}>
            <span>Patient</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form.PatientID ?? ''}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  PatientID: e.target.value
                }));
                clearFieldError(formType, 'PatientID');
              }}
            >
              <option value="">Select patient</option>

              {patientsList.map(patient => (
                <option key={patient.PatientID} value={patient.PatientID}>
                  {patient.FullName}
                </option>
              ))}
            </select>
          </label>
        );
      }

      if (resource === 'appointment' && field === 'DoctorID') {
        const doctorId = form.DoctorID;

        const doctorSchedule = scheduleItems.filter(item => {
          return (
            Number(item.DoctorID) === Number(doctorId) &&
            Number(item.IsAvailable) === 1
          );
        });

        return (
          <label className="form-field" key={field}>
            <span>Doctor</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form.DoctorID ?? ''}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  DoctorID: e.target.value,
                  ServiceID: '',
                  DateTime: ''
                }));

                clearFieldError(formType, 'DoctorID');
                clearFieldError(formType, 'ServiceID');
                clearFieldError(formType, 'DateTime');
              }}
            >
              <option value="">Select doctor</option>

              {doctorsList.map(doctor => (
                <option key={doctor.DoctorID} value={doctor.DoctorID}>
                  {doctor.FullName} — {doctor.Specialization}
                </option>
              ))}
            </select>

            {doctorId && (
              <div className="available-box">
                <b>Available hours:</b>

                {doctorSchedule.length === 0 ? (
                  <p>No available hours for this doctor</p>
                ) : (
                  doctorSchedule.map(item => (
                    <div className="available-day" key={item.ScheduleID}>
                      <span>{dayNames[item.DayOfWeek]}:</span>

                      {makeSlots(item.StartTime, item.EndTime)
                        .filter(slot => {
                          const [start] = slot.split('–');

                          return !appointmentsList.some(app => {
                            if (Number(app.DoctorID) !== Number(doctorId)) return false;
                            if (String(app.Status).toLowerCase() === 'cancelled') return false;

                            const appDate = new Date(String(app.DateTime).replace(' ', 'T'));
                            const appDay = appDate.getDay() || 7;
                            const appTime = String(app.DateTime).slice(11, 16);

                            return appDay === Number(item.DayOfWeek) && appTime === start;
                          });
                        })
                        .map(slot => (
                          <button
                            type="button"
                            className="slot-btn"
                            key={`${item.ScheduleID}-${slot}`}
                            onClick={() => {
                              const today = new Date();
                              const currentDay = today.getDay() || 7;
                              const needDay = Number(item.DayOfWeek);
                              const diff = (needDay - currentDay + 7) % 7;

                              const date = new Date(today);
                              date.setDate(today.getDate() + diff);

                              const [start] = slot.split('–');
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');

                              setForm(prev => ({
                                ...prev,
                                DateTime: `${yyyy}-${mm}-${dd}T${start}`
                              }));

                              clearFieldError(formType, 'DateTime');
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </label>
        );
      }

      if (resource === 'appointment' && field === 'ServiceID') {
        const selectedDoctor = doctorsList.find(
          doctor => Number(doctor.DoctorID) === Number(form.DoctorID)
        );

        const filteredServices = selectedDoctor
          ? servicesList.filter(
              service => Number(service.DepartmentID) === Number(selectedDoctor.DepartmentID)
            )
          : [];

        return (
          <label className="form-field" key={field}>
            <span>Service</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form.ServiceID ?? ''}
              disabled={!form.DoctorID}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  ServiceID: e.target.value
                }));
                clearFieldError(formType, 'ServiceID');
              }}
            >
              <option value="">
                {form.DoctorID ? 'Select service' : 'Select doctor first'}
              </option>

              {filteredServices.map(service => (
                <option key={service.ServiceID} value={service.ServiceID}>
                  {service.Name} — {service.Price} UAH
                </option>
              ))}
            </select>
          </label>
        );
      }

      if (field === 'Status') {
        return (
          <label className="form-field" key={field}>
            <span>Status</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form[field] ?? ''}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  [field]: e.target.value
                }));
                clearFieldError(formType, field);
              }}
            >
              <option value="">Select status</option>
              <option value="scheduled">scheduled</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
        );
      }

      if (field === 'Method') {
        return (
          <label className="form-field" key={field}>
            <span>Method</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form[field] ?? ''}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  [field]: e.target.value
                }));
                clearFieldError(formType, field);
              }}
            >
              <option value="">Select method</option>
              <option value="card">card</option>
              <option value="cash">cash</option>
              <option value="bank">bank</option>
            </select>
          </label>
        );
      }

      if (field === 'role') {
        return (
          <label className="form-field" key={field}>
            <span>Role</span>
            <FieldError formType={formType} field={field} />

            <select
              value={form[field] ?? 'client'}
              onChange={e => {
                setForm(prev => ({
                  ...prev,
                  [field]: e.target.value
                }));
                clearFieldError(formType, field);
              }}
            >
              <option value="client">client</option>
              <option value="admin">admin</option>
            </select>
          </label>
        );
      }

      return (
        <label className="form-field" key={field}>
          <span>{field}</span>
          <FieldError formType={formType} field={field} />

          <input
            type={inputType(field)}
            value={form[field] ?? ''}
            onChange={e => {
              setForm(prev => ({
                ...prev,
                [field]: e.target.value
              }));
              clearFieldError(formType, field);
            }}
          />
        </label>
      );
    });
  }

  function CommentsView() {
  return (
    <div className="comments-grid">
      {items.length === 0 ? (
        <div className="empty-state">
          <h3>No comments yet</h3>
          <p>There are no comments to display.</p>
        </div>
      ) : (
        items.map((item, index) => (
          <div
            className="comment-card"
            key={`comment-${item.CommentID ?? index}`}
          >
            <div className="comment-top">
              <div>
                <h3>{item.DoctorName || 'Doctor'}</h3>

                {item.PatientName && (
                  <p>{item.PatientName}</p>
                )}
              </div>

              <span className="rating-badge">
                ★ {item.Rating || '—'}
              </span>
            </div>

            <p className="comment-text">
              {item.Text}
            </p>

            {item.DateTime && (
              <span className="comment-date">
                {item.DateTime}
              </span>
            )}

            {canEdit() && (
              <div className="comment-actions">
                <button onClick={() => startEdit(item)}>
                  Edit
                </button>

                <button
                  className="danger"
                  onClick={() => removeItem(item[config.pk])}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
  }

  function dayToNumber(day) {
  const map = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7
  };

  return map[day] || Number(day);
}
  
  function ScheduleView() {
  const sortedItems = [...items].sort((a, b) => {
    return (
      String(a.DoctorName || '').localeCompare(String(b.DoctorName || '')) ||
      Number(a.DayOfWeek || 0) - Number(b.DayOfWeek || 0) ||
      String(a.StartTime || '').localeCompare(String(b.StartTime || ''))
    );
  });

  const normalize = value =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const getWeekDay = dateTime => {
    const datePart = String(dateTime || '').slice(0, 10);
    const [y, m, d] = datePart.split('-').map(Number);

    if (!y || !m || !d) return null;

    const date = new Date(y, m - 1, d);
    return date.getDay() === 0 ? 7 : date.getDay();
  };

  const getTime = dateTime => {
    return String(dateTime || '').slice(11, 16);
  };

  const isBooked = (scheduleItem, slot) => {
    const slotTime = slot.split('–')[0].trim();

    return appointmentsList.some(app => {
      if (normalize(app.Status) === 'cancelled') return false;

      const sameDoctor =
        String(app.DoctorID || '') === String(scheduleItem.DoctorID || '') ||
        normalize(app.DoctorName) === normalize(scheduleItem.DoctorName);

      const sameDay =
        Number(getWeekDay(app.DateTime)) === dayToNumber(scheduleItem.DayOfWeek);

      const sameTime =
        getTime(app.DateTime) === slotTime;

      return sameDoctor && sameDay && sameTime;
    });
  };

  const doctors = [
    ...new Map(
      sortedItems
        .filter(item => item.DoctorName)
        .map(item => [
          item.DoctorName,
          {
            name: item.DoctorName,
            specialization: item.Specialization,
            department: item.DepartmentName
          }
        ])
    ).values()
  ];

  return (
    <div className="schedule-section">
      {role === 'admin' && (
        <>
          <h3>Schedule List</h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Department</th>
                  <th>Day</th>
                  <th>Hour slots</th>
                  <th>Availability</th>
                  {canEdit() && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit() ? 8 : 7}>No schedule records</td>
                  </tr>
                ) : (
                  sortedItems.map((item, scheduleIndex) => {
                    const slots = makeSlots(item.StartTime, item.EndTime);
                    const hasFreeSlot = slots.some(slot => !isBooked(item, slot));

                    return (
                      <tr key={`schedule-row-${item.ScheduleID}-${scheduleIndex}`}>
                        <td>{item.ScheduleID}</td>
                        <td>{item.DoctorName}</td>
                        <td>{item.Specialization}</td>
                        <td>{item.DepartmentName}</td>
                        <td>{dayNames[item.DayOfWeek] || item.DayOfWeek}</td>

                        <td>
                          {slots.map((slot, slotIndex) => {
                            const booked = isBooked(item, slot);

                            return (
                              <span
                                key={`slot-${item.ScheduleID}-${slot}-${slotIndex}`}
                                className={booked ? 'schedule-slot booked-slot' : 'schedule-slot'}
                              >
                                {slot} {booked ? 'busy' : 'free'}
                              </span>
                            );
                          })}
                        </td>

                        <td>
                          {hasFreeSlot ? (
                            <span className="badge green">Available</span>
                          ) : (
                            <span className="badge red">Fully booked</span>
                          )}
                        </td>

                        {canEdit() && (
                          <td>
                            <button onClick={() => startEdit(item)}>Edit</button>
                            <button
                              className="danger"
                              onClick={() => removeItem(item[config.pk])}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>Weekly Calendar</h3>

      <div className="table-wrap">
        <table className="schedule-calendar">
          <thead>
            <tr>
              <th>Doctor</th>
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <th key={`week-header-${day}`}>{dayNames[day]}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan="8">No schedule records</td>
              </tr>
            ) : (
              doctors.map((doctor, doctorIndex) => (
                <tr key={`doctor-row-${doctor.name}-${doctorIndex}`}>
                  <td>
                    <div className="doctor-info">
                      <strong>{doctor.name}</strong>
                      <div className="doctor-meta">{doctor.specialization}</div>
                      <div className="doctor-meta">{doctor.department}</div>
                    </div>
                  </td>

                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const dayRows = sortedItems.filter(item =>
                      item.DoctorName === doctor.name &&
                      dayToNumber(item.DayOfWeek) === day &&
                      Number(item.IsAvailable) === 1
                    );

                    const slots = dayRows.flatMap(item =>
                      makeSlots(item.StartTime, item.EndTime)
                    );

                    return (
                      <td key={`calendar-${doctor.name}-${doctorIndex}-${day}`}>
                        {slots.length > 0
                          ? slots.map((slot, slotIndex) => (
                              <span
                                className="schedule-slot"
                                key={`weekly-${doctor.name}-${day}-${slot}-${slotIndex}`}
                              >
                                {slot}
                              </span>
                            ))
                          : <span className="empty-slot">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

  return (
    <div className="app">
      <header className="top-bar">

        <div className="top-bar-content">
          <div>
            <p className="eyebrow">Clinic management system</p>
            <h1>Clinic</h1>
          </div>
        </div>

        <div className="user-box">
          {user ? (
            <>
              <span>{user.patientName || user.username}</span>
              <span className="badge blue">{user.role}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>Login</button>
          )}
        </div>

      </header>

      {showAuth && (
        <div className="auth-overlay">
          <div className="auth-box">
            <p className="auth-label">
              Clinic account
            </p>

            <h2>
              {authMode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>

            <p className="auth-subtitle">
              {authMode === 'login'
                ? 'Sign in to access your clinic dashboard'
                : 'Register as a patient to use personal services'}
            </p>
            <input
  placeholder="Username"
  value={authForm.username}
  onChange={e => {
    setAuthForm({ ...authForm, username: e.target.value });
    setAuthErrors({ ...authErrors, username: '' });
  }}
/>
{authErrors.username && <span className="field-error">{authErrors.username}</span>}

<input
  type="password"
  placeholder="Password"
  value={authForm.password}
  onChange={e => {
    setAuthForm({ ...authForm, password: e.target.value });
    setAuthErrors({ ...authErrors, password: '' });
  }}
/>
{authErrors.password && <span className="field-error">{authErrors.password}</span>}

              {authMode === 'register' && (
                <>
                  <input
                    placeholder="Full name"
                    value={authForm.fullName || ''}
                    onChange={e => {
                      setAuthForm({
                        ...authForm,
                        fullName: e.target.value
                      });

                      setAuthErrors({
                        ...authErrors,
                        fullName: ''
                      });
                    }}
                  />

                  {authErrors.fullName && (
                    <span className="field-error">
                      {authErrors.fullName}
                    </span>
                  )}
                </>
              )}

            <div className="auth-actions">
              {authMode === 'login' ? (
                <>
                  <button onClick={login}>Login</button>
                  <button className="secondary" onClick={() => setAuthMode('register')}>
                    Register
                  </button>
                </>
              ) : (
                <>
                  <button onClick={register}>Create account</button>
                  <button className="secondary" onClick={() => setAuthMode('login')}>
                    Back
                  </button>
                </>
              )}

              <button className="danger" onClick={() => setShowAuth(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel access-panel">
        <span>Current access:</span>
        <b>{role === 'guest' ? 'Guest' : role === 'client' ? 'Client' : 'Administrator'}</b>
      </section>

      <nav className="tabs">
        {availableTables.map(key => (
          <button
            key={key}
            className={resource === key ? 'active' : ''}
            onClick={() => setResource(key)}
          >
            {tables[key].title}
          </button>
        ))}
      </nav>

      <main className="content-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Database table</p>
            <h2>{config.title}</h2>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => {
                  setSearch('');
                  loadData();
                }}
              >
                ×
              </button>
            )}
          </div>

          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="">No sorting</option>
            {fields.map(field => (
              <option key={`sort-${field}`} value={field}>
                {field}
              </option>
            ))}
          </select>

          <select value={direction} onChange={e => setDirection(e.target.value)}>
            <option value="ASC">Ascending</option>
            <option value="DESC">Descending</option>
          </select>

          <button onClick={loadData}>Apply</button>
        </div>

        {message && (
          <p className={messageType === 'success' ? 'message success' : 'message error'}>
            {message}
          </p>
        )}

        {canAdd() && (
          <div className="forms-row">
            <div className="form-box">
              <h3>Add record</h3>

              <form onSubmit={addItem}>
                <FormFields form={addForm} setForm={setAddForm} formType="add" />
                <button type="submit">Add</button>
              </form>
            </div>

            {editingId && (
              <div className="form-box">
                <h3>Edit record</h3>

                <form onSubmit={saveEdit}>
                  <FormFields form={editForm} setForm={setEditForm} formType="edit" />
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingId(null);
                      setEditForm({});
                      setFieldErrors(prev => ({ ...prev, edit: {} }));
                    }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {resource === 'schedule' ? (
          <ScheduleView />
        ) : resource === 'comments' ? (
          <CommentsView />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {fields.map(field => (
                    <th key={field}>{field}</th>
                  ))}
                  {canEdit() && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={fields.length + (canEdit() ? 1 : 0)}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={`${resource}-${item[config.pk] ?? 'no-id'}-${index}`}
                    >
                      {fields.map((field, fieldIndex) => (
                      <td
                        key={`${resource}-${item[config.pk] ?? 'no-id'}-${index}-${field}-${fieldIndex}`}
                      >
                        {item[field]}
                      </td>
                    ))}

                      {canEdit() && (
                        <td>
                          <button onClick={() => startEdit(item)}>Edit</button>
                          <button className="danger" onClick={() => removeItem(item[config.pk])}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}