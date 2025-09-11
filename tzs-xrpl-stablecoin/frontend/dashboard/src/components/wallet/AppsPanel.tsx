'use client'

import { useState } from 'react'
import { 
  CubeIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  StarIcon,
  ClockIcon,
  FireIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface App {
  id: string
  name: string
  description: string
  icon: string
  category: 'defi' | 'nft' | 'gaming' | 'utility'
  status: 'live' | 'beta' | 'coming-soon'
  featured: boolean
  url?: string
}

interface AppsPanelProps {
  onBack: () => void
}

export default function AppsPanel({ onBack }: AppsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'defi' | 'nft' | 'gaming' | 'utility'>('all')

  const apps: App[] = [
    {
      id: '1',
      name: 'TZS Swap',
      description: 'Decentralized exchange for TZS tokens',
      icon: '🔄',
      category: 'defi',
      status: 'live',
      featured: true,
      url: '#'
    },
    {
      id: '2',
      name: 'Mobile Money Bridge',
      description: 'Connect your mobile money accounts',
      icon: '📱',
      category: 'utility',
      status: 'live',
      featured: true,
      url: '#'
    },
    {
      id: '3',
      name: 'TZS Lending',
      description: 'Earn interest on your TZS holdings',
      icon: '💰',
      category: 'defi',
      status: 'beta',
      featured: false,
      url: '#'
    },
    {
      id: '4',
      name: 'NFT Marketplace',
      description: 'Buy and sell NFTs with TZS',
      icon: '🎨',
      category: 'nft',
      status: 'coming-soon',
      featured: false
    },
    {
      id: '5',
      name: 'TZS Gaming',
      description: 'Play games and earn TZS rewards',
      icon: '🎮',
      category: 'gaming',
      status: 'coming-soon',
      featured: false
    },
    {
      id: '6',
      name: 'Portfolio Tracker',
      description: 'Track your crypto portfolio',
      icon: '📊',
      category: 'utility',
      status: 'beta',
      featured: false,
      url: '#'
    }
  ]

  const categories = [
    { id: 'all', name: 'All Apps', icon: CubeIcon },
    { id: 'defi', name: 'DeFi', icon: FireIcon },
    { id: 'nft', name: 'NFTs', icon: StarIcon },
    { id: 'gaming', name: 'Gaming', icon: CubeIcon },
    { id: 'utility', name: 'Utility', icon: ShieldCheckIcon }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'text-green-400 bg-green-400/20'
      case 'beta':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'coming-soon':
        return 'text-blue-400 bg-blue-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const filteredApps = apps.filter(app => 
    selectedCategory === 'all' || app.category === selectedCategory
  )

  const featuredApps = apps.filter(app => app.featured)

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
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-3"
          >
            <ChevronRightIcon className="w-6 h-6 text-white rotate-180" />
          </button>
          <h1 className="text-[24px] font-medium text-white">Apps</h1>
        </div>

        {/* Featured Apps */}
        {featuredApps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white text-[18px] font-medium mb-4 flex items-center">
              <StarIcon className="w-5 h-5 text-[#2A9D9F] mr-2" />
              Featured Apps
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {featuredApps.map((app) => (
                <div key={app.id} className="backdrop-blur-lg bg-gradient-to-r from-[#2A9D9F]/20 to-blue-500/20 rounded-[20px] p-6 border border-[#2A9D9F]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/10 rounded-[16px] flex items-center justify-center text-[24px]">
                        {app.icon}
                      </div>
                      <div>
                        <h3 className="text-white text-[18px] font-medium">{app.name}</h3>
                        <p className="text-white/70 text-[14px] mt-1">{app.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${getStatusColor(app.status)}`}>
                            {app.status.replace('-', ' ')}
                          </span>
                          <span className="text-white/50 text-[12px] capitalize">{app.category}</span>
                        </div>
                      </div>
                    </div>
                    {app.url && (
                      <button className="p-3 bg-white/10 hover:bg-white/20 rounded-[12px] transition-colors">
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-[12px] text-[14px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-[#2A9D9F] text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => (
            <div key={app.id} className="backdrop-blur-lg bg-white/[0.12] hover:bg-white/[0.18] rounded-[20px] p-6 border border-white/[0.15] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-[12px] flex items-center justify-center text-[20px]">
                    {app.icon}
                  </div>
                  <div>
                    <h3 className="text-white text-[16px] font-medium">{app.name}</h3>
                    <p className="text-white/60 text-[14px] mt-1">{app.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${getStatusColor(app.status)}`}>
                        {app.status.replace('-', ' ')}
                      </span>
                      <span className="text-white/50 text-[12px] capitalize">{app.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {app.featured && (
                    <StarIcon className="w-4 h-4 text-[#2A9D9F]" />
                  )}
                  {app.url ? (
                    <button className="p-2 bg-[#2A9D9F]/20 hover:bg-[#2A9D9F]/30 rounded-[8px] transition-colors">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-[#2A9D9F]" />
                    </button>
                  ) : (
                    <div className="p-2 bg-white/5 rounded-[8px]">
                      <ClockIcon className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 backdrop-blur-lg bg-blue-500/10 rounded-[20px] p-6 border border-blue-500/20">
          <h3 className="text-blue-400 text-[16px] font-medium mb-2">More Apps Coming Soon</h3>
          <p className="text-blue-400/80 text-[14px] leading-relaxed">
            We&apos;re constantly working on new applications to enhance your TZS experience. 
            Stay tuned for updates on lending protocols, NFT marketplaces, and gaming platforms.
          </p>
        </div>

        {/* Developer Section */}
        <div className="mt-6 backdrop-blur-lg bg-white/[0.12] rounded-[20px] p-6 border border-white/[0.15]">
          <h3 className="text-white text-[16px] font-medium mb-3">For Developers</h3>
          <p className="text-white/60 text-[14px] mb-4">
            Build on the TZS ecosystem and reach thousands of users across Tanzania.
          </p>
          <button className="bg-[#2A9D9F] hover:bg-[#2A9D9F]/90 rounded-[12px] px-6 py-3 text-white text-[14px] font-medium transition-colors">
            Developer Documentation
          </button>
        </div>
      </div>
    </div>
  )
}
