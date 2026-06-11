'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface GraphNode {
  id: string
  type: 'organizer' | 'festival' | 'artist' | 'venue'
  label: string
  val: number
  color: string
  imageUrl?: string
  slug?: string
  entityId?: string
  x?: number
  y?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'organized_by' | 'lineup' | 'at_venue'
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

const TYPE_LABELS = {
  organizer: 'Organizer',
  festival: 'Festival',
  artist: 'Artist',
  venue: 'Venue',
}

const LINK_COLORS = {
  organized_by: 'rgba(200,255,0,0.4)',
  lineup: 'rgba(245,158,11,0.15)',
  at_venue: 'rgba(8,145,178,0.2)',
}

type FilterType = 'all' | 'organizer' | 'festival' | 'artist' | 'venue'

export default function ExploreGraph() {
  const router = useRouter()
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<GraphLink>>(new Set())
  const [filter, setFilter] = useState<FilterType>('all')
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null)

  // Responsive dimensions
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Fetch graph data
  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then((data: GraphData) => {
        setGraphData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Filter graph data
  const filteredData = useCallback((): GraphData => {
    if (filter === 'all') return graphData
    const filteredNodes = graphData.nodes.filter(n => n.type === filter)
    const filteredIds = new Set(filteredNodes.map(n => n.id))
    const filteredLinks = graphData.links.filter(l => {
      const srcId = typeof l.source === 'string' ? l.source : l.source.id
      const tgtId = typeof l.target === 'string' ? l.target : l.target.id
      return filteredIds.has(srcId) && filteredIds.has(tgtId)
    })
    return { nodes: filteredNodes, links: filteredLinks }
  }, [graphData, filter])

  // Highlight connected nodes on hover/select
  const updateHighlight = useCallback((node: GraphNode | null) => {
    if (!node) {
      setHighlightNodes(new Set())
      setHighlightLinks(new Set())
      return
    }
    const connected = new Set<string>([node.id])
    const connectedLinks = new Set<GraphLink>()
    for (const link of graphData.links) {
      const srcId = typeof link.source === 'string' ? link.source : link.source.id
      const tgtId = typeof link.target === 'string' ? link.target : link.target.id
      if (srcId === node.id || tgtId === node.id) {
        connected.add(srcId)
        connected.add(tgtId)
        connectedLinks.add(link)
      }
    }
    setHighlightNodes(connected)
    setHighlightLinks(connectedLinks)
  }, [graphData.links])

  const handleNodeClick = useCallback((node: GraphNode) => {
    const now = Date.now()
    const last = lastTapRef.current
    // Double-tap to navigate
    if (last && last.id === node.id && now - last.time < 400) {
      // Navigate to entity page
      if (node.type === 'organizer' && node.slug) {
        router.push(`/organizers/${node.slug}`)
      } else if (node.type === 'festival' && node.entityId) {
        router.push(`/events/festival-${node.entityId}`)
      } else if (node.type === 'artist' && node.slug) {
        router.push(`/artists/${encodeURIComponent(node.slug)}`)
      } else if (node.type === 'venue' && node.slug) {
        router.push(`/venues/${node.slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
      }
      lastTapRef.current = null
      return
    }
    lastTapRef.current = { id: node.id, time: now }
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    updateHighlight(node)
    // Center on node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400)
      graphRef.current.zoom(2.5, 400)
    }
  }, [router, updateHighlight])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
  }, [])

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id)
    const isSelected = selectedNode?.id === node.id
    const r = Math.sqrt(node.val) * 3

    ctx.save()
    ctx.globalAlpha = isHighlighted ? 1 : 0.15

    // Glow for organizers or selected
    if (node.type === 'organizer' || isSelected) {
      ctx.shadowBlur = isSelected ? 24 : 16
      ctx.shadowColor = node.color
    }

    // Draw circle
    ctx.beginPath()
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI)
    ctx.fillStyle = isSelected ? node.color : node.color + '99'
    ctx.fill()

    // Border
    ctx.strokeStyle = node.color
    ctx.lineWidth = isSelected ? 2.5 : 1
    ctx.stroke()

    ctx.shadowBlur = 0

    // Label — show at sufficient zoom or when selected/highlighted
    if (globalScale > 1.2 || isSelected || (highlightNodes.has(node.id) && highlightNodes.size > 0)) {
      const fontSize = Math.max(8 / globalScale, isSelected ? 10 : 7)
      ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Inter, sans-serif`
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.75)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label,
        node.x!,
        node.y! + r + fontSize * 0.9
      )
    }

    ctx.restore()
  }, [highlightNodes, selectedNode])

  const linkColor = useCallback((link: GraphLink) => {
    if (highlightLinks.size > 0 && !highlightLinks.has(link)) return 'rgba(255,255,255,0.03)'
    return LINK_COLORS[link.type as keyof typeof LINK_COLORS] || 'rgba(255,255,255,0.1)'
  }, [highlightLinks])

  const linkWidth = useCallback((link: GraphLink) => {
    if (highlightLinks.has(link)) return 1.5
    return 0.5
  }, [highlightLinks])

  const data = filteredData()
  const totalNodes = graphData.nodes.length
  const orgCount = graphData.nodes.filter(n => n.type === 'organizer').length
  const festCount = graphData.nodes.filter(n => n.type === 'festival').length
  const artistCount = graphData.nodes.filter(n => n.type === 'artist').length
  const venueCount = graphData.nodes.filter(n => n.type === 'venue').length

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#050505]">
      {/* Filter pills */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ background: 'linear-gradient(to bottom, rgba(5,5,5,0.95) 70%, transparent)' }}>
        {([
          { key: 'all', label: `All (${totalNodes})` },
          { key: 'organizer', label: `🎪 Orgs (${orgCount})`, color: '#C8FF00' },
          { key: 'festival', label: `🎡 Festivals (${festCount})`, color: '#7C3AED' },
          { key: 'artist', label: `🎤 Artists (${artistCount})`, color: '#F59E0B' },
          { key: 'venue', label: `🏟️ Venues (${venueCount})`, color: '#0891B2' },
        ] as { key: FilterType; label: string; color?: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: filter === f.key ? (f.color || '#ffffff') : 'rgba(255,255,255,0.08)',
              color: filter === f.key ? '#000' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${filter === f.key ? (f.color || '#fff') : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Graph canvas */}
      {!loading && dimensions.width > 0 && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ForceGraph2D
          ref={graphRef}
          graphData={data as any}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#050505"
          nodeCanvasObject={nodeCanvasObject as any}
          nodeCanvasObjectMode={() => 'replace'}
          linkColor={linkColor as any}
          linkWidth={linkWidth as any}
          onNodeClick={handleNodeClick as any}
          onBackgroundClick={handleBackgroundClick}
          cooldownTicks={80}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.3}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={((link: GraphLink) => highlightLinks.has(link) ? 2 : 0) as any}
          linkDirectionalParticleColor={((link: GraphLink) => LINK_COLORS[link.type as keyof typeof LINK_COLORS]) as any}
          nodeRelSize={1}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#C8FF00]/30 border-t-[#C8FF00] animate-spin" />
          <p className="text-white/30 text-sm">Building the graph…</p>
        </div>
      )}

      {/* Selected node panel */}
      {selectedNode && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 pt-4"
          style={{ background: 'linear-gradient(to top, rgba(5,5,5,0.98) 60%, transparent)' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: selectedNode.color + '22', border: `1px solid ${selectedNode.color}44`, color: selectedNode.color }}>
                {selectedNode.type === 'organizer' ? '🎪' :
                 selectedNode.type === 'festival' ? '🎡' :
                 selectedNode.type === 'artist' ? '🎤' : '🏟️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate">{selectedNode.label}</p>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: selectedNode.color }}>
                  {TYPE_LABELS[selectedNode.type]} · {highlightNodes.size - 1} connection{highlightNodes.size - 1 !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  if (selectedNode.type === 'organizer' && selectedNode.slug) router.push(`/organizers/${selectedNode.slug}`)
                  else if (selectedNode.type === 'festival' && selectedNode.entityId) router.push(`/events/festival-${selectedNode.entityId}`)
                  else if (selectedNode.type === 'artist' && selectedNode.slug) router.push(`/artists/${encodeURIComponent(selectedNode.slug)}`)
                  else if (selectedNode.type === 'venue' && selectedNode.slug) router.push(`/venues/${selectedNode.slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
                }}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: selectedNode.color, color: '#000' }}
              >
                View →
              </button>
            </div>
            <p className="text-white/30 text-xs text-center">Tap again to view profile · Double-tap node to navigate</p>
          </div>
        </div>
      )}

      {/* Hint (when nothing selected) */}
      {!selectedNode && !loading && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <p className="text-white/20 text-xs px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            Tap any node to explore connections
          </p>
        </div>
      )}
    </div>
  )
}
