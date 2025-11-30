/**
 * 👥 Group Chat System
 * Create, manage, and chat in groups
 */

export const GroupRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
}

export class GroupManager {
  constructor() {
    this.groups = new Map()
    this.signaling = null
    this.myId = null
    this.handlers = {
      onGroupCreated: [],
      onGroupUpdated: [],
      onMemberAdded: [],
      onMemberRemoved: [],
      onGroupMessage: [],
      onGroupDeleted: [],
    }
  }

  initialize(userId, signaling) {
    this.myId = userId
    this.signaling = signaling
    this.setupSignaling()
  }

  setupSignaling() {
    if (!this.signaling) return

    this.signaling.on('group-created', (data) => {
      this.groups.set(data.groupId, data.group)
      this.emit('onGroupCreated', data)
    })

    this.signaling.on('group-updated', (data) => {
      const group = this.groups.get(data.groupId)
      if (group) {
        Object.assign(group, data.updates)
        this.emit('onGroupUpdated', data)
      }
    })

    this.signaling.on('group-member-added', (data) => {
      const group = this.groups.get(data.groupId)
      if (group) {
        group.members.push(data.member)
        this.emit('onMemberAdded', data)
      }
    })

    this.signaling.on('group-member-removed', (data) => {
      const group = this.groups.get(data.groupId)
      if (group) {
        group.members = group.members.filter(m => m.userId !== data.memberId)
        this.emit('onMemberRemoved', data)
      }
    })

    this.signaling.on('group-message', (data) => {
      this.emit('onGroupMessage', data)
    })

    this.signaling.on('group-deleted', (data) => {
      this.groups.delete(data.groupId)
      this.emit('onGroupDeleted', data)
    })
  }

  createGroup(name, description, members, profilePicture = null) {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const group = {
      id: groupId,
      name,
      description,
      profilePicture,
      createdBy: this.myId,
      createdAt: new Date().toISOString(),
      members: [
        { userId: this.myId, role: GroupRole.OWNER, joinedAt: new Date().toISOString() },
        ...members.map(m => ({ userId: m, role: GroupRole.MEMBER, joinedAt: new Date().toISOString() }))
      ],
      settings: {
        onlyAdminsCanPost: false,
        onlyAdminsCanEditInfo: true,
        disappearingMessages: null,
        muted: false,
      }
    }

    this.groups.set(groupId, group)

    // Notify all members
    members.forEach(memberId => {
      this.signaling?.emit('group-created', {
        targetId: memberId,
        groupId,
        group
      })
    })

    this.emit('onGroupCreated', { groupId, group })
    return group
  }

  addMember(groupId, memberId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isAdmin(groupId)) return false

    const member = { userId: memberId, role: GroupRole.MEMBER, joinedAt: new Date().toISOString() }
    group.members.push(member)

    // Notify all members
    group.members.forEach(m => {
      this.signaling?.emit('group-member-added', {
        targetId: m.userId,
        groupId,
        member
      })
    })

    return true
  }

  removeMember(groupId, memberId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isAdmin(groupId)) return false

    group.members = group.members.filter(m => m.userId !== memberId)

    // Notify all members
    group.members.forEach(m => {
      this.signaling?.emit('group-member-removed', {
        targetId: m.userId,
        groupId,
        memberId
      })
    })

    // Notify removed member
    this.signaling?.emit('group-member-removed', {
      targetId: memberId,
      groupId,
      memberId
    })

    return true
  }

  leaveGroup(groupId) {
    const group = this.groups.get(groupId)
    if (!group) return false

    // If owner, transfer ownership or delete group
    const myMember = group.members.find(m => m.userId === this.myId)
    if (myMember?.role === GroupRole.OWNER) {
      const admins = group.members.filter(m => m.role === GroupRole.ADMIN)
      if (admins.length > 0) {
        admins[0].role = GroupRole.OWNER
      } else if (group.members.length > 1) {
        group.members[1].role = GroupRole.OWNER
      } else {
        return this.deleteGroup(groupId)
      }
    }

    return this.removeMember(groupId, this.myId)
  }

  deleteGroup(groupId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isOwner(groupId)) return false

    // Notify all members
    group.members.forEach(m => {
      this.signaling?.emit('group-deleted', {
        targetId: m.userId,
        groupId
      })
    })

    this.groups.delete(groupId)
    this.emit('onGroupDeleted', { groupId })
    return true
  }

  updateGroup(groupId, updates) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isAdmin(groupId)) return false

    Object.assign(group, updates)

    // Notify all members
    group.members.forEach(m => {
      this.signaling?.emit('group-updated', {
        targetId: m.userId,
        groupId,
        updates
      })
    })

    return true
  }

  makeAdmin(groupId, memberId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isOwner(groupId)) return false

    const member = group.members.find(m => m.userId === memberId)
    if (member) {
      member.role = GroupRole.ADMIN
      this.updateGroup(groupId, { members: group.members })
      return true
    }
    return false
  }

  removeAdmin(groupId, memberId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    if (!this.isOwner(groupId)) return false

    const member = group.members.find(m => m.userId === memberId)
    if (member && member.role === GroupRole.ADMIN) {
      member.role = GroupRole.MEMBER
      this.updateGroup(groupId, { members: group.members })
      return true
    }
    return false
  }

  sendGroupMessage(groupId, message) {
    const group = this.groups.get(groupId)
    if (!group) return false

    // Check if user can post
    if (group.settings.onlyAdminsCanPost && !this.isAdmin(groupId)) {
      return false
    }

    // Send to all members
    group.members.forEach(m => {
      if (m.userId !== this.myId) {
        this.signaling?.emit('group-message', {
          targetId: m.userId,
          groupId,
          message: {
            ...message,
            senderId: this.myId,
            timestamp: new Date().toISOString()
          }
        })
      }
    })

    return true
  }

  muteGroup(groupId, muted = true) {
    const group = this.groups.get(groupId)
    if (group) {
      group.settings.muted = muted
      return true
    }
    return false
  }

  isAdmin(groupId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    const member = group.members.find(m => m.userId === this.myId)
    return member?.role === GroupRole.ADMIN || member?.role === GroupRole.OWNER
  }

  isOwner(groupId) {
    const group = this.groups.get(groupId)
    if (!group) return false
    const member = group.members.find(m => m.userId === this.myId)
    return member?.role === GroupRole.OWNER
  }

  getGroup(groupId) {
    return this.groups.get(groupId)
  }

  getAllGroups() {
    return Array.from(this.groups.values())
  }

  on(event, handler) {
    if (this.handlers[event]) this.handlers[event].push(handler)
  }

  off(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(h => h !== handler)
    }
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(h => h(data))
    }
  }
}

export const groupManager = new GroupManager()
