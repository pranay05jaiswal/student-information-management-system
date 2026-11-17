import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Plus,
  Search,
  Download,
  Trash2,
  Edit3,
  Eye,
  Check,
  Copy,
  X,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Layers,
  Mail,
  Phone,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  Sparkles,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { request } from './api.js';

const emptyStudent = {
  studentId: '',
  name: '',
  email: '',
  department: '',
  section: '',
  semester: '1',
  contact: ''
};

// Distinctive avatar gradients
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)'
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return { background: AVATAR_GRADIENTS[index] };
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function App() {
  const [page, setPage] = useState('overview');
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('campus_theme') || 'dark');

  // Filters & Controls
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Modals & Drawers
  const [form, setForm] = useState(null); // { type: 'student'|'department', student?, department?, values }
  const [viewStudent, setViewStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'student'|'department', item }
  const [saving, setSaving] = useState(false);

  // Notifications & Copy state
  const [toasts, setToasts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [sRes, dRes] = await Promise.all([
        request('/api/students'),
        request('/api/departments')
      ]);
      setStudents(sRes.data || []);
      setDepartments(dRes.data || []);
      if (isRefresh) addToast('Database synchronized successfully', 'info');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut for Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        setForm(null);
        setViewStudent(null);
        setDeleteConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving]);

  // Department student counts
  const counts = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const id = s.department?._id;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [students]);

  // Available sections for the active filter
  const filterSections = useMemo(() => {
    if (!deptFilter) return [];
    const found = departments.find((d) => d._id === deptFilter);
    return found ? found.sections : [];
  }, [departments, deptFilter]);

  // Filtered and Sorted Students
  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => {
      if (deptFilter && s.department?._id !== deptFilter) return false;
      if (secFilter && s.section !== secFilter) return false;
      if (semFilter && String(s.semester) !== String(semFilter)) return false;
      if (!q) return true;
      return [s.studentId, s.name, s.email, s.department?.name, s.section, s.contact]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'studentId') return (a.studentId || '').localeCompare(b.studentId || '');
      if (sortBy === 'semester') return (a.semester || 0) - (b.semester || 0);
      return 0;
    });
  }, [students, query, deptFilter, secFilter, semFilter, sortBy]);

  // Copy Student ID helper
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast(`Copied ID ${text} to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to CSV
  const exportCSV = () => {
    if (!visibleStudents.length) {
      addToast('No students to export', 'error');
      return;
    }
    const headers = ['Student ID', 'Full Name', 'Email', 'Department', 'Section', 'Semester', 'Phone'];
    const rows = visibleStudents.map((s) => [
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.department?.name || ''}"`,
      `"${s.section || ''}"`,
      `"${s.semester}"`,
      `"${s.contact || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CampusDesk_Students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Student roster exported to CSV', 'success');
  };

  // Open forms
  const openStudentForm = (student = null) => {
    setForm({
      type: 'student',
      student,
      formError: '',
      values: student
        ? {
            studentId: student.studentId,
            name: student.name,
            email: student.email,
            department: student.department?._id || '',
            section: student.section || '',
            semester: String(student.semester || '1'),
            contact: student.contact || ''
          }
        : {
            ...emptyStudent,
            department: deptFilter || departments[0]?._id || ''
          }
    });
  };

  const openDepartmentForm = (department = null) => {
    setForm({
      type: 'department',
      department,
      formError: '',
      values: {
        name: department?.name || '',
        sections: department ? department.sections.join(', ') : ''
      }
    });
  };

  const setField = (key, val, extra = {}) => {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: val, ...extra } }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { type, student, department, values } = form;
      if (type === 'student') {
        const path = student
          ? `/api/students/${encodeURIComponent(student.studentId)}`
          : '/api/students';
        await request(path, {
          method: student ? 'PUT' : 'POST',
          body: JSON.stringify({ ...values, semester: Number(values.semester) })
        });
        addToast(student ? 'Student details updated successfully' : 'New student enrolled successfully', 'success');
      } else {
        const sections = [
          ...new Set(values.sections.split(',').map((s) => s.trim()).filter(Boolean))
        ];
        await request(department ? `/api/departments/${department._id}` : '/api/departments', {
          method: department ? 'PUT' : 'POST',
          body: JSON.stringify({ name: values.name, sections })
        });
        addToast(
          department ? 'Department updated successfully' : 'Department created successfully',
          'success'
        );
      }
      setForm(null);
      await loadData();
    } catch (err) {
      setForm((f) => ({ ...f, formError: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, item } = deleteConfirm;
    try {
      if (type === 'student') {
        await request(`/api/students/${encodeURIComponent(item.studentId)}`, { method: 'DELETE' });
        addToast(`Student ${item.name} has been removed.`, 'info');
      } else {
        await request(`/api/departments/${item._id}`, { method: 'DELETE' });
        addToast(`Department ${item.name} has been deleted.`, 'info');
      }
      setDeleteConfirm(null);
      if (viewStudent?._id === item._id) setViewStudent(null);
      await loadData();
    } catch (err) {
      addToast(err.message, 'error');
      setDeleteConfirm(null);
    }
  };

  const sectionsTotal = departments.reduce((acc, d) => acc + (d.sections?.length || 0), 0);
  const activeSemesters = new Set(students.map((s) => s.semester)).size;
  const formSections = departments.find((d) => d._id === form?.values?.department)?.sections || [];

  return (
    <div className="app-layout">
      {/* Sticky Glass Navigation Bar */}
      <header className="top-nav">
        <div className="top-nav-inner">
          <div className="brand-wrapper" onClick={() => setPage('overview')}>
            <div className="brand-icon">
              <GraduationCap size={22} strokeWidth={2.4} />
            </div>
            <div className="brand-details">
              <div className="brand-title">
                CampusDesk
                <span className="brand-badge">PRO</span>
              </div>
              <span className="brand-subtitle">Student Information System</span>
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab-item ${page === 'overview' ? 'active' : ''}`}
              onClick={() => setPage('overview')}
            >
              <LayoutDashboard size={16} />
              Overview
            </button>
            <button
              className={`nav-tab-item ${page === 'students' ? 'active' : ''}`}
              onClick={() => {
                setDeptFilter('');
                setSecFilter('');
                setSemFilter('');
                setQuery('');
                setPage('students');
              }}
            >
              <Users size={16} />
              Students ({students.length})
            </button>
            <button
              className={`nav-tab-item ${page === 'departments' ? 'active' : ''}`}
              onClick={() => setPage('departments')}
            >
              <Building2 size={16} />
              Departments ({departments.length})
            </button>
          </nav>

          <div className="nav-actions">
            <div className="status-pill" title="Live Database Status">
              <span className="status-dot"></span>
              Live DB
            </div>

            <button
              className="icon-btn"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh Data"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => openStudentForm()}
              disabled={!departments.length}
            >
              <Plus size={16} />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content">
        {/* OVERVIEW DASHBOARD */}
        {page === 'overview' && (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Campus Overview</h1>
                <p>Real-time enrollment metrics, department capacity, and recent student activities</p>
              </div>
              <div className="header-action-group">
                <button
                  className="btn btn-secondary"
                  onClick={() => openDepartmentForm()}
                >
                  <Building2 size={16} />
                  Add Department
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openStudentForm()}
                  disabled={!departments.length}
                >
                  <Plus size={16} />
                  Enroll Student
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-indigo">
                    <Users size={20} />
                  </div>
                  <span className="stat-pill">Active Enrolled</span>
                </div>
                <div>
                  <div className="stat-value">{students.length}</div>
                  <div className="stat-label">Total Registered Students</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-emerald">
                    <Building2 size={20} />
                  </div>
                  <span className="stat-pill">Accredited</span>
                </div>
                <div>
                  <div className="stat-value">{departments.length}</div>
                  <div className="stat-label">Active Academic Departments</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-amber">
                    <Layers size={20} />
                  </div>
                  <span className="stat-pill">Class Divisions</span>
                </div>
                <div>
                  <div className="stat-value">{sectionsTotal}</div>
                  <div className="stat-label">Allocated Class Sections</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-cyan">
                    <BookOpen size={20} />
                  </div>
                  <span className="stat-pill">Semester Span</span>
                </div>
                <div>
                  <div className="stat-value">{activeSemesters}</div>
                  <div className="stat-label">Active Semester Cohorts</div>
                </div>
              </div>
            </div>

            {/* Department Enrollment Breakdown */}
            {departments.length > 0 && (
              <div className="analytics-card">
                <div className="analytics-card-title">
                  <h3>Department Distribution</h3>
                  <span className="brand-badge">Capacity Analysis</span>
                </div>

                <div className="distribution-bar">
                  {departments.map((dept, idx) => {
                    const count = counts[dept._id] || 0;
                    const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];
                    const color = colors[idx % colors.length];
                    return (
                      <div
                        key={dept._id}
                        className="distribution-segment"
                        style={{
                          width: `${pct || 1}%`,
                          backgroundColor: color
                        }}
                        title={`${dept.name}: ${count} students (${pct}%)`}
                      />
                    );
                  })}
                </div>

                <div className="distribution-legend">
                  {departments.map((dept, idx) => {
                    const count = counts[dept._id] || 0;
                    const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={dept._id} className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: color }} />
                        <span>{dept.name}:</span>
                        <span className="legend-count">{count}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Students Table */}
            <div className="view-header" style={{ marginBottom: 16 }}>
              <div className="view-title-group">
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recently Enrolled Students</h2>
              </div>
              {students.length > 5 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPage('students')}>
                  View all {students.length} students &rarr;
                </button>
              )}
            </div>

            {loading ? (
              <div className="table-container">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div className="skeleton-box" style={{ width: 140, height: 18 }} />
                    <div className="skeleton-box" style={{ width: 100, height: 18 }} />
                    <div className="skeleton-box" style={{ width: 120, height: 18 }} />
                  </div>
                ))}
              </div>
            ) : students.length ? (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Student Profile</th>
                      <th>Student ID</th>
                      <th>Department</th>
                      <th>Section</th>
                      <th>Semester</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 6).map((student) => (
                      <tr key={student._id}>
                        <td>
                          <div className="student-cell">
                            <div className="avatar-badge" style={getAvatarStyle(student.name)}>
                              {getInitials(student.name)}
                            </div>
                            <div className="student-meta">
                              <span className="student-name">{student.name}</span>
                              <span className="student-email">{student.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <button
                            className="id-chip"
                            onClick={() => copyToClipboard(student.studentId, student._id)}
                            title="Click to copy ID"
                          >
                            {copiedId === student._id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                            {student.studentId}
                          </button>
                        </td>
                        <td>
                          <span className="badge-pill badge-dept">
                            {student.department?.name || 'General'}
                          </span>
                        </td>
                        <td>
                          <span className="badge-pill badge-section">
                            Sec {student.section || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="badge-pill badge-sem">
                            Sem {student.semester}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="action-btn"
                              title="View details"
                              onClick={() => setViewStudent(student)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="action-btn"
                              title="Edit record"
                              onClick={() => openStudentForm(student)}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="action-btn danger"
                              title="Delete record"
                              onClick={() => setDeleteConfirm({ type: 'student', item: student })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Users size={28} />
                </div>
                <h3>No Students Enrolled</h3>
                <p>Get started by adding the first student to your campus database.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => openStudentForm()}
                  disabled={!departments.length}
                >
                  <Plus size={16} />
                  Enroll First Student
                </button>
              </div>
            )}
          </>
        )}

        {/* STUDENTS DIRECTORY VIEW */}
        {page === 'students' && (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Student Directory</h1>
                <p>Manage, search, filter, and export student enrollment records</p>
              </div>
              <div className="header-action-group">
                <button className="btn btn-secondary" onClick={exportCSV}>
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => openStudentForm()}
                  disabled={!departments.length}
                >
                  <Plus size={16} />
                  Enroll Student
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="filter-toolbar">
              <div className="search-input-group">
                <Search size={16} className="search-input-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, ID, email, or section..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button className="clear-search-btn" onClick={() => setQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="filter-controls">
                <select
                  className="select-custom"
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setSecFilter('');
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({counts[d._id] || 0})
                    </option>
                  ))}
                </select>

                {filterSections.length > 0 && (
                  <select
                    className="select-custom"
                    value={secFilter}
                    onChange={(e) => setSecFilter(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {filterSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  className="select-custom"
                  value={semFilter}
                  onChange={(e) => setSemFilter(e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={String(sem)}>
                      Semester {sem}
                    </option>
                  ))}
                </select>

                <select
                  className="select-custom"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="studentId">Sort: Student ID</option>
                  <option value="semester">Sort: Semester</option>
                </select>

                <div className="view-toggle-group">
                  <button
                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <TableIcon size={16} />
                  </button>
                  <button
                    className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Cards View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Students Content: Table or Cards */}
            {loading ? (
              <div className="table-container">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton-box" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div className="skeleton-box" style={{ width: 160, height: 18 }} />
                    <div className="skeleton-box" style={{ width: 100, height: 18 }} />
                    <div className="skeleton-box" style={{ width: 120, height: 18 }} />
                  </div>
                ))}
              </div>
            ) : visibleStudents.length > 0 ? (
              viewMode === 'table' ? (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Student Profile</th>
                        <th>Student ID</th>
                        <th>Department</th>
                        <th>Section</th>
                        <th>Semester</th>
                        <th>Contact</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.map((student) => (
                        <tr key={student._id}>
                          <td>
                            <div className="student-cell">
                              <div className="avatar-badge" style={getAvatarStyle(student.name)}>
                                {getInitials(student.name)}
                              </div>
                              <div className="student-meta">
                                <span className="student-name">{student.name}</span>
                                <span className="student-email">{student.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <button
                              className="id-chip"
                              onClick={() => copyToClipboard(student.studentId, student._id)}
                              title="Click to copy ID"
                            >
                              {copiedId === student._id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              {student.studentId}
                            </button>
                          </td>
                          <td>
                            <span className="badge-pill badge-dept">
                              {student.department?.name || 'General'}
                            </span>
                          </td>
                          <td>
                            <span className="badge-pill badge-section">
                              Sec {student.section || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="badge-pill badge-sem">
                              Sem {student.semester}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {student.contact ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Phone size={12} /> {student.contact}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="action-btn"
                                title="View details"
                                onClick={() => setViewStudent(student)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="action-btn"
                                title="Edit record"
                                onClick={() => openStudentForm(student)}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="action-btn danger"
                                title="Delete record"
                                onClick={() => setDeleteConfirm({ type: 'student', item: student })}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cards-grid">
                  {visibleStudents.map((student) => (
                    <div key={student._id} className="student-card">
                      <div className="student-card-header">
                        <div className="student-cell">
                          <div className="avatar-badge" style={getAvatarStyle(student.name)}>
                            {getInitials(student.name)}
                          </div>
                          <div className="student-meta">
                            <span className="student-name">{student.name}</span>
                            <span className="student-email">{student.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="student-card-body">
                        <div className="student-detail-row">
                          <span className="detail-label">Student ID</span>
                          <button
                            className="id-chip"
                            onClick={() => copyToClipboard(student.studentId, student._id)}
                          >
                            {copiedId === student._id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                            {student.studentId}
                          </button>
                        </div>
                        <div className="student-detail-row">
                          <span className="detail-label">Department</span>
                          <span className="badge-pill badge-dept">{student.department?.name || 'General'}</span>
                        </div>
                        <div className="student-detail-row">
                          <span className="detail-label">Division & Term</span>
                          <span className="detail-val">
                            Section {student.section || '—'} · Semester {student.semester}
                          </span>
                        </div>
                        {student.contact && (
                          <div className="student-detail-row">
                            <span className="detail-label">Contact</span>
                            <span className="detail-val">{student.contact}</span>
                          </div>
                        )}
                      </div>

                      <div className="student-card-footer">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewStudent(student)}
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openStudentForm(student)}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => setDeleteConfirm({ type: 'student', item: student })}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Search size={28} />
                </div>
                <h3>No Matching Students</h3>
                <p>We couldn't find any student matching your filters. Try clearing filters or search terms.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuery('');
                    setDeptFilter('');
                    setSecFilter('');
                    setSemFilter('');
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}

        {/* DEPARTMENTS VIEW */}
        {page === 'departments' && (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Academic Departments</h1>
                <p>Manage college departments, class divisions, sections, and curriculum assignments</p>
              </div>
              <button className="btn btn-primary" onClick={() => openDepartmentForm()}>
                <Plus size={16} />
                Add Department
              </button>
            </div>

            {loading ? (
              <div className="table-container">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton-box" style={{ width: 44, height: 44, borderRadius: 10 }} />
                    <div className="skeleton-box" style={{ width: 180, height: 22 }} />
                    <div className="skeleton-box" style={{ width: 140, height: 18 }} />
                  </div>
                ))}
              </div>
            ) : departments.length > 0 ? (
              <div className="dept-grid">
                {departments.map((dept) => {
                  const studentCount = counts[dept._id] || 0;
                  return (
                    <div key={dept._id} className="dept-card">
                      <div>
                        <div className="dept-card-top">
                          <div className="dept-card-icon">
                            <Building2 size={22} />
                          </div>
                          <span className="badge-pill badge-dept">
                            {dept.sections?.length || 0} Sections
                          </span>
                        </div>

                        <div className="dept-title-group" style={{ marginBottom: 14 }}>
                          <h3>{dept.name}</h3>
                        </div>

                        <div className="sections-list-title">Assigned Sections</div>
                        <div className="section-chips">
                          {dept.sections && dept.sections.length > 0 ? (
                            dept.sections.map((sec) => (
                              <span key={sec} className="section-chip">
                                Section {sec}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active sections</span>
                          )}
                        </div>

                        <div className="dept-stats-row">
                          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Enrolled Students</span>
                          <span className="dept-student-count">
                            <Users size={14} />
                            {studentCount} Students
                          </span>
                        </div>
                      </div>

                      <div className="dept-card-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openDepartmentForm(dept)}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          disabled={studentCount > 0}
                          title={
                            studentCount > 0
                              ? 'Cannot delete department while students are enrolled'
                              : 'Delete Department'
                          }
                          onClick={() => setDeleteConfirm({ type: 'department', item: dept })}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Building2 size={28} />
                </div>
                <h3>No Departments Defined</h3>
                <p>Create your institution's departments before enrolling students.</p>
                <button className="btn btn-primary" onClick={() => openDepartmentForm()}>
                  <Plus size={16} />
                  Add First Department
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>CampusDesk Academic Portal &bull; Enterprise 3-Tier Architecture</div>
        <div className="footer-links">
          <span>Express REST API</span>
          <span>&bull;</span>
          <span>MongoDB Atlas</span>
          <span>&bull;</span>
          <span>React Vite UI</span>
        </div>
      </footer>

      {/* STUDENT DETAIL MODAL / DRAWER */}
      {viewStudent && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewStudent(null);
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-info">
                <div
                  className="avatar-badge"
                  style={{
                    ...getAvatarStyle(viewStudent.name),
                    width: 48,
                    height: 48,
                    fontSize: 18
                  }}
                >
                  {getInitials(viewStudent.name)}
                </div>
                <div className="modal-header-text">
                  <h2>{viewStudent.name}</h2>
                  <p>{viewStudent.email}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setViewStudent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="student-card-body" style={{ margin: '16px 0', border: 'none' }}>
              <div className="dept-stats-row">
                <span className="detail-label">Student ID</span>
                <button
                  className="id-chip"
                  onClick={() => copyToClipboard(viewStudent.studentId, viewStudent._id)}
                >
                  {copiedId === viewStudent._id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  {viewStudent.studentId}
                </button>
              </div>

              <div className="dept-stats-row">
                <span className="detail-label">Department</span>
                <span className="badge-pill badge-dept">{viewStudent.department?.name || 'General'}</span>
              </div>

              <div className="dept-stats-row">
                <span className="detail-label">Assigned Section</span>
                <span className="badge-pill badge-section">Section {viewStudent.section || '—'}</span>
              </div>

              <div className="dept-stats-row">
                <span className="detail-label">Academic Semester</span>
                <span className="badge-pill badge-sem">Semester {viewStudent.semester}</span>
              </div>

              <div className="dept-stats-row">
                <span className="detail-label">Phone Contact</span>
                <span className="detail-val">{viewStudent.contact || 'Not provided'}</span>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const s = viewStudent;
                  setViewStudent(null);
                  openStudentForm(s);
                }}
              >
                <Edit3 size={15} /> Edit Details
              </button>
              <button
                className="btn btn-danger-outline"
                onClick={() => {
                  const s = viewStudent;
                  setViewStudent(null);
                  setDeleteConfirm({ type: 'student', item: s });
                }}
              >
                <Trash2 size={15} /> Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FORM MODAL */}
      {form && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setForm(null);
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="modal-header-icon">
                  {form.type === 'student' ? <GraduationCap size={20} /> : <Building2 size={20} />}
                </div>
                <div className="modal-header-text">
                  <h2>
                    {form.type === 'student'
                      ? form.student
                        ? 'Edit Student Profile'
                        : 'Enroll New Student'
                      : form.department
                      ? 'Edit Department'
                      : 'Create Department'}
                  </h2>
                  <p>Fill in the required information below</p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                <X size={18} />
              </button>
            </div>

            {form.formError && (
              <div className="form-error-banner">
                <AlertCircle size={16} />
                <span>{form.formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {form.type === 'student' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Student ID Number</label>
                    <input
                      required
                      maxLength={30}
                      className="form-input"
                      placeholder="e.g. STU-2026-001"
                      disabled={Boolean(form.student)}
                      value={form.values.studentId}
                      onChange={(e) => setField('studentId', e.target.value)}
                    />
                    {form.student && (
                      <p className="form-hint">Student IDs are permanent identifiers and cannot be altered.</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Legal Name</label>
                    <input
                      required
                      maxLength={100}
                      className="form-input"
                      placeholder="e.g. Alexander Vance"
                      value={form.values.name}
                      onChange={(e) => setField('name', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Institutional Email</label>
                    <input
                      required
                      type="email"
                      maxLength={254}
                      className="form-input"
                      placeholder="alexander@campus.edu"
                      value={form.values.email}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Academic Department</label>
                    <select
                      required
                      className="form-select"
                      value={form.values.department}
                      onChange={(e) => setField('department', e.target.value, { section: '' })}
                    >
                      <option value="" disabled>
                        Select Academic Department
                      </option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Class Section</label>
                      <select
                        required={formSections.length > 0}
                        disabled={!formSections.length}
                        className="form-select"
                        value={form.values.section}
                        onChange={(e) => setField('section', e.target.value)}
                      >
                        <option value="" disabled={formSections.length > 0}>
                          {formSections.length ? 'Select Section' : 'None Available'}
                        </option>
                        {formSections.map((s) => (
                          <option key={s} value={s}>
                            Section {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Semester</label>
                      <select
                        required
                        className="form-select"
                        value={form.values.semester}
                        onChange={(e) => setField('semester', e.target.value)}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                          <option key={s} value={String(s)}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Contact (Optional)</label>
                    <input
                      type="tel"
                      maxLength={20}
                      className="form-input"
                      placeholder="+1 (555) 019-2834"
                      value={form.values.contact}
                      onChange={(e) => setField('contact', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Department Name</label>
                    <input
                      required
                      maxLength={80}
                      className="form-input"
                      placeholder="e.g. Computer Science and Engineering"
                      value={form.values.name}
                      onChange={(e) => setField('name', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned Sections (Comma Separated)</label>
                    <input
                      maxLength={500}
                      className="form-input"
                      placeholder="e.g. A, B, C, D"
                      value={form.values.sections}
                      onChange={(e) => setField('sections', e.target.value)}
                    />
                    <p className="form-hint">
                      Sections with actively enrolled students cannot be removed.
                    </p>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Processing...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL (Replaces browser confirm) */}
      {deleteConfirm && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirm(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-header-info">
                <div
                  className="modal-header-icon"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                >
                  <AlertCircle size={22} />
                </div>
                <div className="modal-header-text">
                  <h2 style={{ color: 'var(--danger)' }}>Confirm Deletion</h2>
                  <p>This action cannot be undone</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
              Are you sure you want to permanently remove{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.item.name}</strong>?
              {deleteConfirm.type === 'department' && (
                <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  Only departments with zero enrolled students can be deleted.
                </span>
              )}
            </p>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={executeDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-content">
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
              {toast.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
              {toast.type === 'info' && <Sparkles size={18} color="var(--info)" />}
              <span>{toast.message}</span>
            </div>
            <button className="modal-close-btn" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
