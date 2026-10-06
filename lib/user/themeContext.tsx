'use client'

import { createContext, useContext } from 'react'
import type { UserTheme } from './theme'

/** Tema activo del panel de cliente, para componentes que lo necesitan en JS (p. ej. el mapa) */
export const UserThemeContext = createContext<UserTheme>('light')

export const useUserTheme = () => useContext(UserThemeContext)

/** Cambia el tema desde cualquier pantalla del panel (p. ej. Mi perfil). Lo provee DashboardNavClient. */
export const UserThemeSetterContext = createContext<(theme: UserTheme) => void>(() => {})

export const useSetUserTheme = () => useContext(UserThemeSetterContext)
