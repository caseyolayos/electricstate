'use client'

import { useEffect } from 'react'
import OneSignal from 'react-onesignal'

export default function OneSignalInit() {
  useEffect(() => {
    OneSignal.init({
      appId: 'a97b8d40-5643-4c07-b825-a235ea88fead',
      safari_web_id: 'web.onesignal.auto.a97b8d40-5643-4c07-b825-a235ea88fead',
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true,
    }).catch(() => {})
  }, [])

  return null
}
