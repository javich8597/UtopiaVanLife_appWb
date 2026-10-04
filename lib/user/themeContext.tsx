'use client'

import { createContext, useContext } from 'react'
import type { UserTheme } from './theme'

/** Tema activo del panel de cliente, para componentes que lo necesitan en JS (p. ej. el mapa) */
export const UserThemeContext = createContext<UserTheme>('light')

export const useUserTheme = () => useContext(UserThemeContext)
