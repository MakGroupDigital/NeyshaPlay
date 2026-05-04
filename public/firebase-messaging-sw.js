/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBVgR1qeDg_Z9eXc7mJ5WzprlvTCMhJr4o',
  authDomain: 'studio-4725166594-b0358.firebaseapp.com',
  projectId: 'studio-4725166594-b0358',
  storageBucket: 'studio-4725166594-b0358.appspot.com',
  messagingSenderId: '42990010526',
  appId: '1:42990010526:web:b2167b12a7cd9a233cfb8f',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'NeyshaPlay'
  const options = {
    body: payload.notification?.body || payload.data?.content || 'Nouvelle notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: {
      url: payload.data?.url || '/notifications',
    },
  }

  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
