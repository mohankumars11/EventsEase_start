/**
 * The More tab, as a grouped list rather than seventeen accordions.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { Group, Row } from '../../src/components/ui/SettingsList'
import {
  Store, UserRound, Landmark, ShieldCheck, Bell, MessageSquare,
  Star, LifeBuoy, Settings, LogOut, Navigation, Sparkles,
} from 'lucide-react'

export default function MoreList() {
  return (
    <MemoryRouter>
      <div style={{ width: 390, padding: 16, background: '#FFFFFF' }}>
        <div className="space-y-4">
          <Group title="Partner">
            <Row icon={UserRound} label="Partner profile" onClick={() => {}} />
            <Row icon={Store} label="My services" onClick={() => {}}
                 badge="2 drafts" tone="attention" />
            <Row icon={Sparkles} label="Business profile" onClick={() => {}} />
          </Group>

          <Group title="Operations">
            <Row icon={Navigation} label="Availability & service area" onClick={() => {}} />
            <Row icon={ShieldCheck} label="Verification & documents" onClick={() => {}}
                 badge="3 missing" tone="attention" />
            <Row icon={Landmark} label="Bank & payments" onClick={() => {}}
                 badge="Checking" tone="attention" />
          </Group>

          <Group title="Communication">
            <Row icon={Bell} label="Notifications" onClick={() => {}} badge={3} tone="attention" />
            <Row icon={MessageSquare} label="Messages" onClick={() => {}} badge="New" tone="attention" />
            <Row icon={Star} label="Reviews" onClick={() => {}} badge="4.8" tone="count" />
          </Group>

          <Group title="Support">
            <Row icon={LifeBuoy} label="Help & support" onClick={() => {}} />
          </Group>

          <Group title="Account">
            <Row icon={Settings} label="Settings" onClick={() => {}} />
            <Row icon={LogOut} label="Sign out" danger onClick={() => {}} />
          </Group>
        </div>
      </div>
    </MemoryRouter>
  )
}
