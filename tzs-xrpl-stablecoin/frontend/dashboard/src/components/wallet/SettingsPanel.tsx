'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface SettingsPanelProps {
  onBack: () => void
}

export default function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState<'main' | 'profile' | 'security' | 'notifications'>('main')
  const [isEditing, setIsEditing] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
    fullName: user?.display_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    transactionAlerts: true,
    securityAlerts: true,
    marketingEmails: false
  })

  const handleProfileSave = async () => {
    try {
      // TODO: Implement profile update API call
      console.log('Saving profile:', profileData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match')
      return
    }
    
    try {
      // TODO: Implement password change API call
      console.log('Changing password')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Failed to change password:', error)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const renderMainSettings = () => (
    <div className="space-y-4">
      {/* Profile Section */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#2A9D9F]/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-[#2A9D9F]" />
            </div>
            <div>
              <h3 className="text-white text-[16px] font-medium">Profile</h3>
              <p className="text-white/60 text-[14px]">Manage your account information</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('profile')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        <div className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-white/60">Name</span>
            <span className="text-white">{user?.display_name || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Username</span>
            <span className="text-white">{user?.username || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Email</span>
            <span className="text-white">{user?.email || 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-white text-[16px] font-medium">Security</h3>
              <p className="text-white/60 text-[14px]">Password and security settings</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('security')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        <div className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-white/60">Password</span>
            <span className="text-white">••••••••</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Two-Factor Auth</span>
            <span className="text-orange-400">Not enabled</span>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white text-[16px] font-medium">Notifications</h3>
              <p className="text-white/60 text-[14px]">Manage your notification preferences</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('notifications')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-white/60" />
          </button>
        </div>
        
        <div className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-white/60">Push Notifications</span>
            <span className="text-green-400">Enabled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Email Alerts</span>
            <span className="text-green-400">Enabled</span>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <h3 className="text-white text-[16px] font-medium mb-4">Wallet Information</h3>
        <div className="space-y-3 text-[14px]">
          <div>
            <span className="text-white/60 block mb-1">Wallet Address</span>
            <span className="text-white font-mono text-[12px] break-all">
              {user?.wallet_address || 'Not available'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Balance</span>
            <span className="text-[#2A9D9F] font-medium">TZS {user?.balance || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full backdrop-blur-lg bg-red-500/20 hover:bg-red-500/30 rounded-[20px] p-6 border border-red-500/30 transition-colors flex items-center justify-center space-x-3"
      >
        <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-400" />
        <span className="text-red-400 text-[16px] font-medium">Sign Out</span>
      </button>
    </div>
  )

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-[20px] font-medium">Profile Settings</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#2A9D9F]/20 hover:bg-[#2A9D9F]/30 rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4 text-[#2A9D9F]" />
            <span className="text-[#2A9D9F] text-[14px] font-medium">Edit</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleProfileSave}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
            >
              <CheckIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-[14px] font-medium">Save</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-[14px] font-medium">Cancel</span>
            </button>
          </div>
        )}
      </div>

      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15] space-y-4">
        <div>
          <label className="block text-white/70 text-[14px] font-medium mb-2">Full Name</label>
          <input
            type="text"
            value={profileData.fullName}
            onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
            disabled={!isEditing}
            className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-white/70 text-[14px] font-medium mb-2">Username</label>
          <input
            type="text"
            value={profileData.username}
            onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
            disabled={!isEditing}
            className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-white/70 text-[14px] font-medium mb-2">Email</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
            className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-white/70 text-[14px] font-medium mb-2">Phone (Optional)</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
            disabled={!isEditing}
            placeholder="+255 XXX XXX XXX"
            className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <h2 className="text-white text-[20px] font-medium mb-6">Security Settings</h2>

      {/* Change Password */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <h3 className="text-white text-[16px] font-medium mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/70 text-[14px] font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 pr-12 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-[14px] font-medium mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 pr-12 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-[14px] font-medium mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-[12px] px-4 py-3 pr-12 text-white text-[16px] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#2A9D9F] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handlePasswordChange}
            className="w-full bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 rounded-[12px] py-3 text-white text-[16px] font-medium transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white text-[16px] font-medium">Two-Factor Authentication</h3>
            <p className="text-white/60 text-[14px] mt-1">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-orange-400 text-[14px]">Not enabled</span>
            <button className="bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 rounded-lg px-4 py-2 text-white text-[14px] font-medium transition-colors">
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Login Sessions */}
      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
        <h3 className="text-white text-[16px] font-medium mb-4">Active Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-3">
              <DevicePhoneMobileIcon className="w-5 h-5 text-[#2A9D9F]" />
              <div>
                <p className="text-white text-[14px] font-medium">Current Device</p>
                <p className="text-white/60 text-[12px]">Last active: Now</p>
              </div>
            </div>
            <span className="text-green-400 text-[12px] px-2 py-1 bg-green-400/20 rounded">Active</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <h2 className="text-white text-[20px] font-medium mb-6">Notification Settings</h2>

      <div className="backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15] space-y-4">
        {Object.entries(notificationSettings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-[16px] font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <p className="text-white/60 text-[14px]">
                {key === 'pushNotifications' && 'Receive push notifications on your device'}
                {key === 'emailNotifications' && 'Receive notifications via email'}
                {key === 'transactionAlerts' && 'Get notified about transactions'}
                {key === 'securityAlerts' && 'Important security notifications'}
                {key === 'marketingEmails' && 'Promotional emails and updates'}
              </p>
            </div>
            <button
              onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-[#2A9D9F]' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#1e3a5f] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-24 h-24 bg-[#2A9D9F] rounded-full blur-2xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-12 pb-24">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={activeSection === 'main' ? onBack : () => setActiveSection('main')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-3"
          >
            <ChevronRightIcon className="w-6 h-6 text-white rotate-180" />
          </button>
          <h1 className="text-[24px] font-medium text-white">
            {activeSection === 'main' && 'Settings'}
            {activeSection === 'profile' && 'Profile'}
            {activeSection === 'security' && 'Security'}
            {activeSection === 'notifications' && 'Notifications'}
          </h1>
        </div>

        {/* Content Sections */}
        {activeSection === 'main' && renderMainSettings()}
        {activeSection === 'profile' && renderProfileSettings()}
        {activeSection === 'security' && renderSecuritySettings()}
        {activeSection === 'notifications' && renderNotificationSettings()}
      </div>
    </div>
  )
}
