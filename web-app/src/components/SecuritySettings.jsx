import React, { useState, useEffect } from 'react'
import { securityManager } from '../security/securityManager'

export default function SecuritySettings({ onBack }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSecurityStatus()
  }, [])

  const loadSecurityStatus = () => {
    const securityStatus = securityManager.getSecurityStatus()
    setStatus(securityStatus)
    setLoading(false)
  }

  const toggleFeature = async (featureName) => {
    const isEnabled = status.features[featureName]
    
    if (isEnabled) {
      securityManager.disableFeature(featureName)
    } else {
      const userId = JSON.parse(localStorage.getItem('user')).id
      const socket = window.socket // Assuming socket is available globally
      await securityManager.enableFeature(featureName, userId, socket)
    }
    
    loadSecurityStatus()
  }

  if (loading) {
    return <div className="container">Loading security settings...</div>
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="search-icon" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        <div className="header-title">Security Settings</div>
      </div>

      {/* Security Score */}
      <div style={{ padding: '20px', background: '#1a1a1a', margin: '20px', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00a8ff' }}>
            {status.overallSecurity.score}%
          </div>
          <div style={{ fontSize: '18px', color: '#fff', marginTop: '8px' }}>
            Security Level: {status.overallSecurity.level}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {status.overallSecurity.enabledFeatures} of {status.overallSecurity.totalFeatures} features enabled
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div style={{ padding: '0 20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '16px' }}>Security Features</h3>

        {/* Signal Protocol */}
        <div className="security-feature-card">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#00a8ff' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Signal Protocol</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {status.signalProtocol.description}
            </div>
          </div>
          <div className={`toggle ${status.features.signalProtocol ? 'active' : ''}`}>
            {status.features.signalProtocol ? '✓' : ''}
          </div>
        </div>

        {/* Traffic Padding */}
        <div className="security-feature-card" onClick={() => toggleFeature('trafficPadding')}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a8ff" strokeWidth="2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Traffic Padding</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {status.trafficPadding.description}
            </div>
          </div>
          <div className={`toggle ${status.features.trafficPadding ? 'active' : ''}`}>
            {status.features.trafficPadding ? '✓' : ''}
          </div>
        </div>

        {/* P2P Connection */}
        <div className="security-feature-card">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a8ff" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>P2P Connections</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {status.p2pConnection.description}
            </div>
            {status.features.p2pConnection && (
              <div style={{ fontSize: '11px', color: '#00a8ff', marginTop: '4px' }}>
                Connected peers: {status.p2pConnection.stats.connectedPeers}
              </div>
            )}
          </div>
          <div className={`toggle ${status.features.p2pConnection ? 'active' : ''}`}>
            {status.features.p2pConnection ? '✓' : ''}
          </div>
        </div>

        {/* Tor Proxy */}
        <div className="security-feature-card" onClick={() => toggleFeature('torProxy')}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a8ff" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Tor Proxy</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {status.torProxy.description}
            </div>
            {status.features.torProxy && (
              <div style={{ fontSize: '11px', color: '#00a8ff', marginTop: '4px' }}>
                Circuit hops: {status.torProxy.circuit.hops}
              </div>
            )}
          </div>
          <div className={`toggle ${status.features.torProxy ? 'active' : ''}`}>
            {status.features.torProxy ? '✓' : ''}
          </div>
        </div>

        {/* Decentralized Storage */}
        <div className="security-feature-card">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a8ff" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>Decentralized Storage</span>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {status.decentralizedStorage.description}
            </div>
            {status.features.decentralizedStorage && (
              <div style={{ fontSize: '11px', color: '#00a8ff', marginTop: '4px' }}>
                Network peers: {status.decentralizedStorage.stats.peers}
              </div>
            )}
          </div>
          <div className={`toggle ${status.features.decentralizedStorage ? 'active' : ''}`}>
            {status.features.decentralizedStorage ? '✓' : ''}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '20px', margin: '20px', background: '#1a1a1a', borderRadius: '12px' }}>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
          <strong style={{ color: '#00a8ff' }}>All features are FREE and open source!</strong>
          <br/><br/>
          These advanced security features protect your privacy and make your messages untraceable.
          Enable all features for maximum security.
        </div>
      </div>
    </div>
  )
}
