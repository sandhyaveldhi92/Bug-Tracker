import React, { useEffect, useState } from 'react'
import { apiRequest } from './api/api'
import './App.css'

function App() {
  // ==========================================
  // AUTHENTICATION STATE
  // ==========================================

  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('access_token'))
  )
  const [authMode, setAuthMode] = useState('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registrationData, setRegistrationData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [loginError, setLoginError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  // ==========================================
  // MAIN APPLICATION STATE
  // ==========================================

  const [projects, setProjects] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingIssueId, setEditingIssueId] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  // ==========================================
  // PROJECT MEMBER STATE
  // ==========================================

  const [memberProjectId, setMemberProjectId] = useState(null)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState('Developer')
  const [projectMembers, setProjectMembers] = useState([])
  const [issueMembers, setIssueMembers] = useState([])
// ==========================================
// EDIT PROJECT MEMBER ROLE
// ==========================================

const [editingMemberRoles, setEditingMemberRoles] = useState({})

  // ==========================================
  // ISSUE COMMENTS STATE
  // ==========================================

  const [selectedIssueForComments, setSelectedIssueForComments] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')

  // ==========================================
  // ISSUE STATUS HISTORY STATE
  // ==========================================

  const [selectedIssueForHistory, setSelectedIssueForHistory] = useState(null)
  const [statusHistory, setStatusHistory] = useState([])

  // ==========================================
  // SEARCH, FILTER AND SORT STATE
  // ==========================================

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [assigneeFilter, setAssigneeFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')

  // ==========================================
  // PROJECT FORM STATE
  // ==========================================

  const [projectFormData, setProjectFormData] = useState({
    name: '',
    key: '',
    description: ''
  })

  // ==========================================
  // ISSUE FORM STATE
  // ==========================================

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    issue_type: 'Bug',
    priority: 'Medium',
    status: 'To Do'
  })

  // ==========================================
  // HANDLE AUTHENTICATION ERRORS
  // ==========================================

  const handleProtectedApiError = (error, fallbackMessage) => {
    const message = error?.message || ''
    const isAuthError = error?.status === 401 ||
      /401|unauthorized|not authenticated|invalid.*token|token.*expired|expired.*token/i.test(message)

    if (isAuthError) {
      localStorage.removeItem('access_token')
      setIsAuthenticated(false)
      setProjects([])
      setIssues([])
      setIssueMembers([])
      setProjectMembers([])
      setMemberProjectId(null)
      setSelectedIssueForComments(null)
      setComments([])
      setSelectedIssueForHistory(null)
      setStatusHistory([])
      setLoginError('Your session expired. Please log in again.')
      setAuthMode('login')
      setLoading(false)
      return true
    }

    setErrorMessage(message || fallbackMessage)
    return false
  }

  // ==========================================
  // LOAD PROJECTS AND ISSUES
  // ==========================================

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const projectData = await apiRequest('/projects/')
      const projectList = Array.isArray(projectData) ? projectData : []
      setProjects(projectList)

      setFormData(previous => {
        const currentProjectExists = projectList.some(
          project => String(project.id) === String(previous.project_id)
        )

        return {
          ...previous,
          project_id: currentProjectExists
            ? previous.project_id
            : projectList.length > 0
              ? String(projectList[0].id)
              : ''
        }
      })

      const issueResponses = await Promise.all(
        projectList.map(project => apiRequest(`/issues/project/${project.id}`))
      )

      const allIssues = issueResponses.flatMap(result =>
        Array.isArray(result) ? result : []
      )

      allIssues.sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )

      setIssues(allIssues)
    } catch (error) {
      handleProtectedApiError(error, 'Unable to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard()
    } else {
      setProjects([])
      setIssues([])
      setIssueMembers([])
      setLoading(false)
    }
    // Authentication state controls the dashboard load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ==========================================
  // LOAD MEMBERS FOR THE SELECTED ISSUE PROJECT
  // ==========================================

  useEffect(() => {
    if (!isAuthenticated || !formData.project_id) {
      setIssueMembers([])
      return undefined
    }

    let cancelled = false

    const loadIssueMembers = async () => {
      try {
        const members = await apiRequest(
          `/projects/${formData.project_id}/members`
        )
        if (!cancelled) {
          setIssueMembers(Array.isArray(members) ? members : [])
        }
      } catch (error) {
        if (!cancelled) {
          setIssueMembers([])
          handleProtectedApiError(error, 'Failed to load project members')
        }
      }
    }

    loadIssueMembers()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, formData.project_id])

  // ==========================================
  // LOGIN
  // ==========================================

  const handleLogin = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setLoginError('')
      setAuthMessage('')

      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginData.email.trim(),
          password: loginData.password
        })
      })

      if (!response?.access_token) {
        throw new Error('Access token was not received from the server')
      }

      localStorage.setItem('access_token', response.access_token)
      setLoginData({ email: '', password: '' })
      setLoading(true)
      setIsAuthenticated(true)
    } catch (error) {
      setLoginError(error.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // REGISTRATION
  // ==========================================

  const handleRegister = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setLoginError('')
      setAuthMessage('')

      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: registrationData.username.trim(),
          email: registrationData.email.trim(),
          password: registrationData.password
        })
      })

      setAuthMessage('Registration successful! Please log in.')
      setLoginData({
        email: registrationData.email.trim(),
        password: ''
      })
      setRegistrationData({ username: '', email: '', password: '' })
      setAuthMode('login')
    } catch (error) {
      setLoginError(error.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const switchAuthMode = mode => {
    setAuthMode(mode)
    setLoginError('')
    setAuthMessage('')
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setIsAuthenticated(false)
    setProjects([])
    setIssues([])
    setIssueMembers([])
    setProjectMembers([])
    setMemberProjectId(null)
    setSelectedProjectId(null)
    setEditingProjectId(null)
    setEditingIssueId(null)
    setSelectedIssueForComments(null)
    setComments([])
    setCommentText('')
    setSelectedIssueForHistory(null)
    setStatusHistory([])
    setSearchQuery('')
    setStatusFilter('All')
    setPriorityFilter('All')
    setAssigneeFilter('All')
    setSortBy('newest')
    setErrorMessage('')
    setSuccessMessage('')
    setAuthMode('login')
    setLoginError('')
    setAuthMessage('You have logged out successfully.')
  }

  // ==========================================
  // FORM INPUT HANDLERS
  // ==========================================

  const handleChange = event => {
    const { name, value } = event.target
    setFormData(previous => ({ ...previous, [name]: value }))
  }

  const handleProjectChange = event => {
    const { name, value } = event.target
    setProjectFormData(previous => ({
      ...previous,
      [name]: name === 'key' ? value.toUpperCase() : value
    }))
  }

  // ==========================================
  // CREATE PROJECT
  // ==========================================

  const handleCreateProject = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const newProject = await apiRequest('/projects/', {
        method: 'POST',
        body: JSON.stringify({
          name: projectFormData.name.trim(),
          key: projectFormData.key.trim().toUpperCase(),
          description: projectFormData.description.trim() || null
        })
      })

      setProjects(previous => [...previous, newProject])
      setFormData(previous => ({ ...previous, project_id: String(newProject.id) }))
      setProjectFormData({ name: '', key: '', description: '' })
      setSuccessMessage('Project created successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // EDIT PROJECT
  // ==========================================

  const handleEditProject = project => {
    setEditingProjectId(project.id)
    setProjectFormData({
      name: project.name || '',
      key: project.key || '',
      description: project.description || ''
    })
    setErrorMessage('')
    setSuccessMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ==========================================
  // UPDATE PROJECT
  // ==========================================

  const handleUpdateProject = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const updatedProject = await apiRequest(
        `/projects/${editingProjectId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: projectFormData.name.trim(),
            key: projectFormData.key.trim().toUpperCase(),
            description: projectFormData.description.trim() || null
          })
        }
      )

      setProjects(previous => previous.map(project =>
        project.id === editingProjectId ? updatedProject : project
      ))
      setEditingProjectId(null)
      setProjectFormData({ name: '', key: '', description: '' })
      setSuccessMessage('Project updated successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelProjectEdit = () => {
    setEditingProjectId(null)
    setProjectFormData({ name: '', key: '', description: '' })
    setErrorMessage('')
    setSuccessMessage('')
  }

  // ==========================================
  // DELETE PROJECT
  // ==========================================

  const handleDeleteProject = async projectId => {
    const project = projects.find(item => item.id === projectId)
    if (!project) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    )
    if (!confirmed) return

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      await apiRequest(`/projects/${projectId}`, { method: 'DELETE' })

      const remainingProjects = projects.filter(item => item.id !== projectId)
      setProjects(remainingProjects)

      if (selectedProjectId === projectId) setSelectedProjectId(null)
      if (memberProjectId === projectId) {
        setMemberProjectId(null)
        setProjectMembers([])
      }
      if (String(formData.project_id) === String(projectId)) {
        setFormData(previous => ({
          ...previous,
          project_id: remainingProjects.length > 0
            ? String(remainingProjects[0].id)
            : '',
          assignee_id: ''
        }))
      }

      setSuccessMessage('Project deleted successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to delete project')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // VIEW PROJECT MEMBERS
  // ==========================================

  const handleViewProjectMembers = async projectId => {
    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const members = await apiRequest(`/projects/${projectId}/members`)
      setProjectMembers(Array.isArray(members) ? members : [])
      setMemberProjectId(projectId)
      setSuccessMessage('Project members loaded successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to load project members')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // ADD PROJECT MEMBER
  // ==========================================

  const handleAddProjectMember = async event => {
    event.preventDefault()
    const userId = Number(memberUserId)

    if (!memberUserId.trim() || !Number.isInteger(userId) || userId <= 0) {
      setErrorMessage('Please enter a valid user ID')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      await apiRequest(`/projects/${memberProjectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role: memberRole })
      })

      const members = await apiRequest(`/projects/${memberProjectId}/members`)
      setProjectMembers(Array.isArray(members) ? members : [])
      setMemberUserId('')
      setSuccessMessage('Project member added successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to add project member')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // RESET ISSUE FORM
  // ==========================================

  const resetForm = () => {
    setEditingIssueId(null)
    setFormData({
      title: '',
      description: '',
      project_id: projects.length > 0 ? String(projects[0].id) : '',
      assignee_id: '',
      issue_type: 'Bug',
      priority: 'Medium',
      status: 'To Do'
    })
  }

  // ==========================================
  // CREATE ISSUE
  // ==========================================

  const handleSubmit = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      if (!formData.project_id) throw new Error('Please select a project')

      const issueData = {
        title: formData.title.trim(),
        description: formData.description,
        project_id: Number(formData.project_id),
        issue_type: formData.issue_type,
        priority: formData.priority,
        status: formData.status,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null
      }

      const newIssue = await apiRequest('/issues/', {
        method: 'POST',
        body: JSON.stringify(issueData)
      })

      setIssues(previous => [newIssue, ...previous])
      setSuccessMessage('Issue created successfully!')
      resetForm()
    } catch (error) {
      handleProtectedApiError(error, 'Failed to create issue')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // EDIT ISSUE
  // ==========================================

  const handleEdit = issue => {
    setEditingIssueId(issue.id)
    setFormData({
      title: issue.title || '',
      description: issue.description || '',
      project_id: String(issue.project_id),
      assignee_id: issue.assignee_id ? String(issue.assignee_id) : '',
      issue_type: issue.issue_type || 'Bug',
      priority: issue.priority || 'Medium',
      status: issue.status || 'To Do'
    })
    setErrorMessage('')
    setSuccessMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ==========================================
  // UPDATE ISSUE
  // ==========================================

  const handleUpdate = async event => {
    event.preventDefault()

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const issueData = {
        title: formData.title.trim(),
        description: formData.description,
        issue_type: formData.issue_type,
        priority: formData.priority,
        status: formData.status,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null
      }

      const updatedIssue = await apiRequest(`/issues/${editingIssueId}`, {
        method: 'PUT',
        body: JSON.stringify(issueData)
      })

      setIssues(previous => previous.map(issue =>
        issue.id === editingIssueId ? updatedIssue : issue
      ))
      setSuccessMessage('Issue updated successfully!')
      resetForm()
    } catch (error) {
      handleProtectedApiError(error, 'Failed to update issue')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    resetForm()
    setErrorMessage('')
    setSuccessMessage('')
  }

  // ==========================================
  // DELETE ISSUE
  // ==========================================

  const handleDelete = async issueId => {
    const confirmed = window.confirm('Are you sure you want to delete this issue?')
    if (!confirmed) return

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      await apiRequest(`/issues/${issueId}`, { method: 'DELETE' })
      setIssues(previous => previous.filter(issue => issue.id !== issueId))

      if (editingIssueId === issueId) resetForm()
      if (selectedIssueForComments?.id === issueId) {
        setSelectedIssueForComments(null)
        setComments([])
        setCommentText('')
      }
      if (selectedIssueForHistory?.id === issueId) {
        setSelectedIssueForHistory(null)
        setStatusHistory([])
      }

      setSuccessMessage('Issue deleted successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to delete issue')
    } finally {
      setSubmitting(false)
    }
  }

// ==========================================
// UPDATE PROJECT MEMBER ROLE
// ==========================================

const handleUpdateMemberRole = async (userId) => {
  const newRole = editingMemberRoles[userId]

  if (!newRole) {
    setErrorMessage('Please select a role')
    return
  }

  try {
    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const updatedMember = await apiRequest(
      `/projects/${memberProjectId}/members/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          role: newRole
        })
      }
    )

    setProjectMembers(prev =>
      prev.map(member =>
        member.user_id === userId
          ? updatedMember
          : member
      )
    )

    setEditingMemberRoles(prev => ({
  ...prev,
  [userId]: updatedMember.role
}))

    setSuccessMessage('Project member role updated successfully!')

  } catch (error) {
    handleProtectedApiError(
      error,
      'Failed to update project member role'
    )
  } finally {
    setSubmitting(false)
  }
}


  
// ==========================================
// REMOVE PROJECT MEMBER
// ==========================================

const handleRemoveProjectMember = async (userId) => {

  const confirmed = window.confirm(
    `Are you sure you want to remove User ID ${userId} from this project?`
  )

  if (!confirmed) return

  try {
    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    await apiRequest(
      `/projects/${memberProjectId}/members/${userId}`,
      {
        method: 'DELETE'
      }
    )

    // Update member list without refreshing the page
    setProjectMembers(prev =>
      prev.filter(
        member => Number(member.user_id) !== Number(userId)
      )
    )

    // Clear the member's editing state
    setEditingMemberRoles(prev => {
      const updated = { ...prev }
      delete updated[userId]
      return updated
    })

    setSuccessMessage(
      'Project member removed successfully!'
    )

  } catch (error) {
    handleProtectedApiError(
      error,
      'Failed to remove project member'
    )
  } finally {
    setSubmitting(false)
  }
}

 // ==========================================
  // VIEW ISSUE COMMENTS
  // ==========================================

  const handleViewComments = async issue => {
    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const commentData = await apiRequest(`/comments/issue/${issue.id}`)
      setSelectedIssueForComments(issue)
      setComments(Array.isArray(commentData) ? commentData : [])
      setCommentText('')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to load issue comments')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // CREATE ISSUE COMMENT
  // ==========================================

  const handleAddComment = async event => {
    event.preventDefault()

    if (!selectedIssueForComments) {
      setErrorMessage('Please select an issue')
      return
    }
    if (!commentText.trim()) {
      setErrorMessage('Comment cannot be empty')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const newComment = await apiRequest('/comments/', {
        method: 'POST',
        body: JSON.stringify({
          content: commentText.trim(),
          issue_id: selectedIssueForComments.id
        })
      })

      setComments(previous => [...previous, newComment])
      setCommentText('')
      setSuccessMessage('Comment added successfully!')
    } catch (error) {
      handleProtectedApiError(error, 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseComments = () => {
    setSelectedIssueForComments(null)
    setComments([])
    setCommentText('')
  }

  // ==========================================
  // VIEW ISSUE STATUS HISTORY
  // ==========================================

  const handleViewStatusHistory = async issue => {
    try {
      setSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const historyData = await apiRequest(`/issues/${issue.id}/history`)
      setSelectedIssueForHistory(issue)
      setStatusHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error) {
      handleProtectedApiError(error, 'Failed to load issue status history')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseStatusHistory = () => {
    setSelectedIssueForHistory(null)
    setStatusHistory([])
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const totalProjects = projects.length
  const totalIssues = issues.length
  const openIssues = issues.filter(issue => issue.status !== 'Done').length
  const completedIssues = issues.filter(issue => issue.status === 'Done').length
  const pendingIssues = issues.filter(issue => issue.status !== 'Done').length

  // ==========================================
  // ANALYTICS DATA
  // ==========================================

  const statusAnalytics = [
    { label: 'To Do', count: issues.filter(issue => issue.status === 'To Do').length },
    { label: 'In Progress', count: issues.filter(issue => issue.status === 'In Progress').length },
    { label: 'Done', count: issues.filter(issue => issue.status === 'Done').length }
  ]

  const priorityAnalytics = [
    { label: 'Critical', count: issues.filter(issue => issue.priority === 'Critical').length },
    { label: 'High', count: issues.filter(issue => issue.priority === 'High').length },
    { label: 'Medium', count: issues.filter(issue => issue.priority === 'Medium').length },
    { label: 'Low', count: issues.filter(issue => issue.priority === 'Low').length }
  ]

  const projectAnalytics = projects.map(project => {
    const projectIssues = issues.filter(
      issue => Number(issue.project_id) === Number(project.id)
    )
    return {
      id: project.id,
      name: project.name,
      total: projectIssues.length,
      completed: projectIssues.filter(issue => issue.status === 'Done').length,
      pending: projectIssues.filter(issue => issue.status !== 'Done').length
    }
  })

  const assigneeIds = [...new Set(
    issues.map(issue => issue.assignee_id == null ? 'unassigned' : String(issue.assignee_id))
  )]

  const assigneeAnalytics = assigneeIds.map(assigneeId => ({
    key: assigneeId,
    label: assigneeId === 'unassigned' ? 'Unassigned' : `User ID ${assigneeId}`,
    count: issues.filter(issue => assigneeId === 'unassigned'
      ? issue.assignee_id == null
      : String(issue.assignee_id) === assigneeId
    ).length
  }))

  // ==========================================
  // PROJECT FILTER
  // ==========================================

  const projectFilteredIssues = selectedProjectId !== null
    ? issues.filter(issue => Number(issue.project_id) === Number(selectedProjectId))
    : issues

  // ==========================================
  // ADVANCED ISSUE FILTERING AND SEARCH
  // ==========================================

  const filteredIssues = projectFilteredIssues.filter(issue => {
    const search = searchQuery.trim().toLowerCase()

    const matchesSearch = !search ||
      (issue.title || '').toLowerCase().includes(search) ||
      (issue.description || '').toLowerCase().includes(search) ||
      String(issue.id).includes(search) ||
      (issue.priority || '').toLowerCase().includes(search) ||
      (issue.status || '').toLowerCase().includes(search)

    const matchesStatus = statusFilter === 'All' || issue.status === statusFilter
    const matchesPriority = priorityFilter === 'All' || issue.priority === priorityFilter
    const matchesAssignee = assigneeFilter === 'All' ||
      String(issue.assignee_id ?? '') === assigneeFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee
  })

  // ==========================================
  // ISSUE SORTING
  // ==========================================

  const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 }

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      case 'oldest':
        return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      case 'title':
        return (a.title || '').localeCompare(b.title || '')
      case 'priority':
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      default:
        return 0
    }
  })

  const selectedMemberProject = projects.find(
    project => Number(project.id) === Number(memberProjectId)
  )

  // ==========================================
  // LOGIN AND REGISTRATION PAGE
  // ==========================================

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Bug Tracker</h1>

          {authMode === 'login' ? (
            <>
              <h2>Welcome Back!</h2>
              <p>Login to manage your projects and issues.</p>

              {loginError && <div className="error-message">{loginError}</div>}
              {authMessage && <div className="success-message">{authMessage}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    type="email"
                    id="login-email"
                    value={loginData.email}
                    onChange={event => setLoginData(previous => ({
                      ...previous,
                      email: event.target.value
                    }))}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    value={loginData.password}
                    onChange={event => setLoginData(previous => ({
                      ...previous,
                      password: event.target.value
                    }))}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <p className="auth-switch">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchAuthMode('register')}>
                  Register here
                </button>
              </p>
            </>
          ) : (
            <>
              <h2>Create Account</h2>
              <p>Register to start using Bug Tracker.</p>

              {loginError && <div className="error-message">{loginError}</div>}
              {authMessage && <div className="success-message">{authMessage}</div>}

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label htmlFor="register-username">Username</label>
                  <input
                    type="text"
                    id="register-username"
                    value={registrationData.username}
                    onChange={event => setRegistrationData(previous => ({
                      ...previous,
                      username: event.target.value
                    }))}
                    placeholder="Enter username"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="register-email">Email Address</label>
                  <input
                    type="email"
                    id="register-email"
                    value={registrationData.email}
                    onChange={event => setRegistrationData(previous => ({
                      ...previous,
                      email: event.target.value
                    }))}
                    placeholder="Enter email address"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <input
                    type="password"
                    id="register-password"
                    value={registrationData.password}
                    onChange={event => setRegistrationData(previous => ({
                      ...previous,
                      password: event.target.value
                    }))}
                    placeholder="Create password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>

                <button type="submit" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Create Account'}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => switchAuthMode('login')}>
                  Login here
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>Loading Bug Tracker...</h2>
      </div>
    )
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>Bug Tracker</h1>
          <p>Manage projects and track issues efficiently.</p>
        </div>
        <button type="button" onClick={handleLogout}>Logout</button>
      </header>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* DASHBOARD STATISTICS */}
      <section className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <h2>{totalProjects}</h2>
        </div>
        <div className="stat-card">
          <h3>Total Issues</h3>
          <h2>{totalIssues}</h2>
        </div>
        <div className="stat-card">
          <h3>Open Issues</h3>
          <h2>{openIssues}</h2>
        </div>
      </section>

      {/* =====================================
          DASHBOARD ANALYTICS
      ===================================== */}
      <section className="dashboard-section">
        <h2>Dashboard Analytics</h2>

        <div className="analytics-card">
          <h3>Issues by Status</h3>
          {statusAnalytics.map(item => (
            <div className="analytics-row" key={item.label}>
              <div className="analytics-label">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="analytics-track">
                <div
                  className="analytics-bar"
                  style={{ width: `${totalIssues > 0 ? (item.count / totalIssues) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-card">
          <h3>Issues by Priority</h3>
          {priorityAnalytics.map(item => (
            <div className="analytics-row" key={item.label}>
              <div className="analytics-label">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="analytics-track">
                <div
                  className="analytics-bar"
                  style={{ width: `${totalIssues > 0 ? (item.count / totalIssues) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-card">
          <h3>Completed vs Pending Issues</h3>
          <p>Total Issues: <strong>{totalIssues}</strong></p>
          <p>Completed: <strong>{completedIssues}</strong></p>
          <p>Pending: <strong>{pendingIssues}</strong></p>
          <div className="analytics-track">
            <div
              className="analytics-bar"
              style={{ width: `${totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="analytics-card">
          <h3>Project-wise Issue Statistics</h3>
          {projectAnalytics.length === 0 ? (
            <p>No project analytics available.</p>
          ) : projectAnalytics.map(project => (
            <div className="analytics-row" key={project.id}>
              <h4>{project.name}</h4>
              <p>Total Issues: {project.total}</p>
              <p>Completed: {project.completed}</p>
              <p>Pending: {project.pending}</p>
              <div className="analytics-track">
                <div
                  className="analytics-bar"
                  style={{ width: `${project.total > 0 ? (project.completed / project.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-card">
          <h3>Issues Assigned to Each User</h3>
          {assigneeAnalytics.length === 0 ? (
            <p>No assigned issues yet.</p>
          ) : assigneeAnalytics.map(item => (
            <div className="analytics-row" key={item.key}>
              <div className="analytics-label">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="analytics-track">
                <div
                  className="analytics-bar"
                  style={{ width: `${totalIssues > 0 ? (item.count / totalIssues) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================
          CREATE / EDIT PROJECT
      ===================================== */}
      <section className="dashboard-section">
        <h2>{editingProjectId ? 'Edit Project' : 'Create New Project'}</h2>
        <form onSubmit={editingProjectId ? handleUpdateProject : handleCreateProject}>
          <div className="form-group">
            <label htmlFor="project-name">Project Name</label>
            <input
              type="text"
              id="project-name"
              name="name"
              value={projectFormData.name}
              onChange={handleProjectChange}
              placeholder="Enter project name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="project-key">Project Key</label>
            <input
              type="text"
              id="project-key"
              name="key"
              value={projectFormData.key}
              onChange={handleProjectChange}
              placeholder="Example: BUG2"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="project-description">Project Description</label>
            <textarea
              id="project-description"
              name="description"
              value={projectFormData.description}
              onChange={handleProjectChange}
              placeholder="Enter project description"
              rows="3"
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : editingProjectId ? 'Update Project' : 'Create Project'}
          </button>
          {editingProjectId && (
            <button type="button" onClick={handleCancelProjectEdit} disabled={submitting}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {/* =====================================
          MY PROJECTS
      ===================================== */}
      <section className="dashboard-section">
        <h2>My Projects</h2>
        {projects.length === 0 ? (
          <p>No projects found. Create your first project!</p>
        ) : (
          <div className="projects-list">
            {projects.map(project => (
              <div className="project-card" key={project.id}>
                <h3>{project.name}</h3>
                <p><strong>Project Key:</strong> {project.key}</p>
                <p><strong>Description:</strong> {project.description || 'No description'}</p>
                <p><strong>Project ID:</strong> {project.id}</p>

                <div className="project-actions">
                  <button type="button" onClick={() => setSelectedProjectId(project.id)}>
                    View Project Issues
                  </button>
                  <button type="button" onClick={() => handleEditProject(project)}>
                    Edit Project
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project.id)}
                    className="delete-button"
                    disabled={submitting}
                  >
                    Delete Project
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewProjectMembers(project.id)}
                    disabled={submitting}
                  >
                    View Members
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          PROJECT MEMBER MANAGEMENT
      ===================================== */}
      {memberProjectId !== null && (
        <section className="dashboard-section">
          <h2>
            Project Members
            {selectedMemberProject ? ` - ${selectedMemberProject.name}` : ''}
          </h2>

          <button
            type="button"
            onClick={() => {
              setMemberProjectId(null)
              setProjectMembers([])
              setMemberUserId('')
            }}
          >
            Close Members
          </button>

          <h3>Add Project Member</h3>
          <form onSubmit={handleAddProjectMember}>
            <div className="form-group">
              <label htmlFor="member-user-id">User ID</label>
              <input
                type="number"
                id="member-user-id"
                value={memberUserId}
                onChange={event => setMemberUserId(event.target.value)}
                placeholder="Enter registered user ID"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="member-role">Project Role</label>
              <select
                id="member-role"
                value={memberRole}
                onChange={event => setMemberRole(event.target.value)}
              >
                <option value="Developer">Developer</option>
                <option value="Tester">Tester</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Project Member'}
            </button>
          </form>

          <h3>Current Members</h3>
          {projectMembers.length === 0 ? (
            <p>No project members found.</p>
          ) : (
            <div className="members-list">
              
{projectMembers.map(member => (
  <div
    className="member-card"
    key={member.id}
  >

    <p>
      <strong>User ID:</strong>{' '}
      {member.user_id}
    </p>

    <p>
      <strong>Current Role:</strong>{' '}
      {member.role}
    </p>

    <p>
      <strong>Membership ID:</strong>{' '}
      {member.id}
    </p>

    {/* EDIT MEMBER ROLE */}

    <div className="form-group">

      <label htmlFor={`member-role-${member.user_id}`}>
        Update Role
      </label>

      <select
        id={`member-role-${member.user_id}`}
        value={
          editingMemberRoles[member.user_id] ?? member.role
        }
        onChange={event =>
          setEditingMemberRoles(prev => ({
            ...prev,
            [member.user_id]: event.target.value
          }))
        }
      >
        <option value="Admin">Admin</option>
        <option value="Developer">Developer</option>
        <option value="Tester">Tester</option>
      </select>

      <button
        type="button"
        onClick={() =>
          handleUpdateMemberRole(member.user_id)
        }
        disabled={
          submitting ||
          (editingMemberRoles[member.user_id] ?? member.role) === member.role
        }
      >
        Save Role
      </button>
      <button
  type="button"
  onClick={() =>
    handleRemoveProjectMember(member.user_id)
  }
  disabled={submitting}
>
  Remove Member
</button>

    </div>

  </div>
))}

              
    
            </div>
          )}
        </section>
      )}

      {/* =====================================
          CREATE / EDIT ISSUE
      ===================================== */}
      <section className="dashboard-section">
        <h2>{editingIssueId ? 'Edit Issue' : 'Create New Issue'}</h2>

        <form onSubmit={editingIssueId ? handleUpdate : handleSubmit}>
          <div className="form-group">
            <label htmlFor="project_id">Project</label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              required
              disabled={!!editingIssueId}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="assignee_id">Assign To</label>
            <select
              id="assignee_id"
              name="assignee_id"
              value={formData.assignee_id}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>
              {issueMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  User ID: {member.user_id} - {member.role}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="title">Issue Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter issue title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter issue description"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="issue_type">Issue Type</label>
            <select id="issue_type" name="issue_type" value={formData.issue_type} onChange={handleChange}>
              <option value="Bug">Bug</option>
              <option value="Feature">Feature</option>
              <option value="Task">Task</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <button type="submit" disabled={submitting || projects.length === 0}>
            {submitting
              ? 'Please wait...'
              : editingIssueId ? 'Update Issue' : 'Create Issue'}
          </button>

          {editingIssueId && (
            <button type="button" onClick={handleCancelEdit} disabled={submitting}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {/* =====================================
          RECENT ISSUES, SEARCH, FILTERS, SORT
      ===================================== */}
      <section className="dashboard-section">
        <h2>Recent Issues</h2>

        <div className="form-group">
          <label htmlFor="search-issues">Search Issues</label>
          <input
            type="search"
            id="search-issues"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search by title, description, ID, priority or status"
          />
        </div>

        <div className="form-group">
          <label htmlFor="status-filter">Filter by Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority-filter">Filter by Priority</label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="assignee-filter">Filter by Assignee</label>
          <select
            id="assignee-filter"
            value={assigneeFilter}
            onChange={event => setAssigneeFilter(event.target.value)}
          >
            <option value="All">All Assignees</option>
            <option value="">Unassigned</option>
            {[...new Set(
              issues
                .map(issue => issue.assignee_id)
                .filter(id => id !== null && id !== undefined)
            )].sort((a, b) => Number(a) - Number(b)).map(userId => (
              <option key={userId} value={String(userId)}>
                User ID: {userId}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="sort-issues">Sort Issues By</label>
          <select
            id="sort-issues"
            value={sortBy}
            onChange={event => setSortBy(event.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title (A-Z)</option>
            <option value="priority">Priority (High to Low)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            setStatusFilter('All')
            setPriorityFilter('All')
            setAssigneeFilter('All')
            setSortBy('newest')
            setSelectedProjectId(null)
          }}
        >
          Clear All Filters
        </button>

        {selectedProjectId !== null && (
          <button type="button" onClick={() => setSelectedProjectId(null)}>
            Show All Project Issues
          </button>
        )}

        {sortedIssues.length === 0 ? (
          <p>
            {searchQuery || statusFilter !== 'All' || priorityFilter !== 'All' || assigneeFilter !== 'All'
              ? 'No matching issues found.'
              : selectedProjectId !== null
                ? 'No issues found for this project.'
                : 'No issues found. Create your first issue!'}
          </p>
        ) : (
          <div className="issues-list">
            {sortedIssues.map(issue => (
              <div className="issue-card" key={issue.id}>
                <h3>{issue.title}</h3>
                <p><strong>Issue ID:</strong> {issue.id}</p>
                <p><strong>Description:</strong> {issue.description || 'No description'}</p>
                <p><strong>Issue Type:</strong> {issue.issue_type}</p>
                <p><strong>Priority:</strong> {issue.priority}</p>
                <p><strong>Status:</strong> {issue.status}</p>
                <p><strong>Project ID:</strong> {issue.project_id}</p>
                <p><strong>Assignee ID:</strong> {issue.assignee_id ?? 'Unassigned'}</p>

                <div className="issue-actions">
                  <button type="button" onClick={() => handleEdit(issue)}>
                    Edit Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(issue.id)}
                    className="delete-button"
                    disabled={submitting}
                  >
                    Delete Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewComments(issue)}
                    disabled={submitting}
                  >
                    View Comments
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewStatusHistory(issue)}
                    disabled={submitting}
                  >
                    View History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================
          ISSUE COMMENTS DISPLAY
      ===================================== */}
      {selectedIssueForComments && (
        <section className="dashboard-section">
          <h2>Comments - {selectedIssueForComments.title}</h2>
          <p>Issue ID: {selectedIssueForComments.id}</p>

          <button type="button" onClick={handleCloseComments}>
            Close Comments
          </button>

          <h3>Discussion</h3>
          {comments.length === 0 ? (
            <p>No comments yet. Start the discussion!</p>
          ) : (
            <div className="comments-list">
              {comments.map(comment => (
                <div className="comment-card" key={comment.id}>
                  <p>{comment.content}</p>
                  <p><strong>Author ID:</strong> {comment.author_id}</p>
                  <p>
                    <strong>Posted:</strong>{' '}
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleString()
                      : 'Recently'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h3>Add Comment</h3>
          <form onSubmit={handleAddComment}>
            <div className="form-group">
              <label htmlFor="comment-content">Your Comment</label>
              <textarea
                id="comment-content"
                value={commentText}
                onChange={event => setCommentText(event.target.value)}
                placeholder="Write your comment here..."
                rows="4"
                required
              />
            </div>
            <button type="submit" disabled={submitting || !commentText.trim()}>
              {submitting ? 'Posting...' : 'Add Comment'}
            </button>
          </form>
        </section>
      )}

      {/* =====================================
          ISSUE STATUS HISTORY DISPLAY
      ===================================== */}
      {selectedIssueForHistory && (
        <section className="dashboard-section">
          <h2>Status History - {selectedIssueForHistory.title}</h2>
          <p>Issue ID: {selectedIssueForHistory.id}</p>

          <button type="button" onClick={handleCloseStatusHistory}>
            Close History
          </button>

          <h3>Status Changes</h3>
          {statusHistory.length === 0 ? (
            <p>No status changes recorded yet.</p>
          ) : (
            <div className="status-history-list">
              {statusHistory.map(record => (
                <div className="status-history-card" key={record.id}>
                  <p><strong>Previous Status:</strong> {record.previous_status}</p>
                  <p><strong>New Status:</strong> {record.new_status}</p>
                  <p><strong>Changed By:</strong> User ID {record.changed_by_id}</p>
                  <p>
                    <strong>Changed At:</strong>{' '}
                    {record.changed_at
                      ? new Date(record.changed_at).toLocaleString()
                      : 'Not available'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
