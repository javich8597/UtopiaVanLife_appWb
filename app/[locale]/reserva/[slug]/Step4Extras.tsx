'use client'

import React, { useState } from 'react'
import { Plus, Minus, Check, Info } from 'lucide-react'
import { Step4Data, SelectedWizardExtra, WizardExtraItem } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface Step4ExtrasProps {
    data: Step4Data
    availableExtras: WizardExtraItem[]
    totalDays: number
    includedItems?: string[]
    onChange: (data: Step4Data) => void
}

const INCLUDED_EQUIPMENT = [
    'Set de limpieza',
    'Almohadas, sábanas y toallas',
    'Dos sillas de camping para exterior',
    'Menaje completo premium',
    '2 máscaras de snorkel',
    'Toldo',
]

export const ALLOWED_EXTRAS_CATALOG: WizardExtraItem[] = [
    {
        id: 'extra-chair-unit',
        name_es: 'Silla exterior adicional',
        category: 'Equipamiento',
        price: 10,
        price_type: 'per_rental',
        description: 'Silla plegable ultraligera adicional para exterior (la camper ya incluye 2 sillas de serie).',
    },
    {
        id: 'extra-table-unit',
        name_es: 'Mesa exterior adicional',
        category: 'Equipamiento',
        price: 15,
        price_type: 'per_rental',
        description: 'Mesa plegable de aluminio adicional para comer o trabajar en el exterior.',
    },
    {
        id: 'extra-cleaning-set',
        name_es: 'Set limpieza adicional',
        category: 'Equipamiento',
        price: 10,
        price_type: 'per_rental',
        description: 'Recambio adicional de productos de limpieza biodegradables, bayetas y estropajos.',
    },
    {
        id: 'extra-bedding-kit',
        name_es: 'Kit cama adicional',
        category: 'Confort',
        price: 20,
        price_type: 'per_rental',
        description: 'Juego completo adicional de almohada, sábanas y toallas (la camper ya incluye ropa de cama de serie).',
    },
    {
        id: 'extra-snorkel-mask',
        name_es: 'Kit snorkel adicional',
        category: 'Deporte',
        price: 10,
        price_type: 'per_rental',
        description: 'Máscara de snorkel panorámica antivaho adicional (la camper ya incluye 2 máscaras de serie).',
    },
    {
        id: 'extra-paddle-surf',
        name_es: 'Padelsurf con hinchador',
        category: 'Deporte',
        price: 45,
        price_type: 'per_rental',
        description: 'Pack completo con tabla de Paddle Surf (SUP) hinchable, remo telescópico, hinchador de doble acción y mochila.',
    },
    {
        id: 'extra-bike-rack',
        name_es: 'Portabicicletas',
        category: 'Deporte',
        price: 40,
        price_type: 'per_rental',
        description: 'Soporte homologado en portón trasero con capacidad para transportar hasta 2 bicicletas.',
    },
    {
        id: 'extra-bicycle',
        name_es: 'Bicicleta',
        category: 'Deporte',
        price: 35,
        price_type: 'per_rental',
        description: 'Bicicleta de paseo/trekking con casco y candado incluidos para recorrer la isla.',
    },
]

export default function Step4Extras({
    data,
    availableExtras,
    totalDays,
    includedItems,
    onChange,
}: Step4ExtrasProps) {
    const [openTooltipId, setOpenTooltipId] = useState<string | null>(null)
    const effectiveDays = Math.max(1, totalDays || 1)

    // Usar extras configurados en la base de datos (panel de admin) y fallback al catálogo estático solo si no hay filas
    const effectiveCatalog = Array.isArray(availableExtras) && availableExtras.length > 0
        ? availableExtras
        : ALLOWED_EXTRAS_CATALOG
    const effectiveIncluded = Array.isArray(includedItems) && includedItems.length > 0
        ? includedItems
        : INCLUDED_EQUIPMENT

    const isSelected = (extraId: string) => {
        return data.selectedExtras.some((item) => item.id === extraId)
    }

    const getSelectedQuantity = (extraId: string) => {
        const item = data.selectedExtras.find((i) => i.id === extraId)
        return item ? item.quantity : 0
    }

    const handleToggleExtra = (extra: WizardExtraItem) => {
        const existing = data.selectedExtras.find((i) => i.id === extra.id)
        if (existing) {
            onChange({
                selectedExtras: data.selectedExtras.filter((i) => i.id !== extra.id),
            })
        } else {
            const newItem: SelectedWizardExtra = {
                id: extra.id,
                name_es: extra.name_es || extra.name || 'Extra',
                price: Number(extra.price) || 0,
                price_type: extra.price_type === 'per_day' ? 'per_day' : 'per_rental',
                quantity: 1,
                category: extra.category || 'Equipamiento',
            }
            onChange({
                selectedExtras: [...data.selectedExtras, newItem],
            })
        }
    }

    const handleQuantityChange = (extraId: string, delta: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const existing = data.selectedExtras.find((i) => i.id === extraId)
        if (!existing) return

        const newQty = existing.quantity + delta
        if (newQty <= 0) {
            onChange({
                selectedExtras: data.selectedExtras.filter((i) => i.id !== extraId),
            })
        } else {
            onChange({
                selectedExtras: data.selectedExtras.map((i) =>
                    i.id === extraId ? { ...i, quantity: newQty } : i
                ),
            })
        }
    }

    return (
        <div className="step-extras">
            <div className="step-header">
                <span className="step-header__tag">PASO 6 DE 7</span>
                <h2 className="step-header__title">Material incluido y extras</h2>
            </div>

            {/* 1. Material Incluido en la Camper */}
            <div className="included-block">
                <div className="included-block__header">
                    <span className="included-block__title">Incluido en tu camper</span>
                    <span className="included-block__badge">Incluido</span>
                </div>
                <div className="included-chips">
                    {effectiveIncluded.map((item, idx) => (
                        <div key={idx} className="included-chip">
                            <Check size={15} strokeWidth={2.2} className="included-chip-icon" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Extras Opcionales Comprimidos */}
            <div className="extras-section">
                <h3 className="extras-section__title">Añadir extras opcionales</h3>

                <div className="extras-compact-grid">
                    {effectiveCatalog.map((extra) => {
                        const selected = isSelected(extra.id)
                        const qty = getSelectedQuantity(extra.id)
                        const unitPrice = Number(extra.price) || 0
                        const isDaily = extra.price_type === 'per_day'
                        const isTooltipOpen = openTooltipId === extra.id

                        return (
                            <div
                                key={extra.id}
                                className={`extra-row ${selected ? 'extra-row--selected' : ''}`}
                                onClick={() => handleToggleExtra(extra)}
                            >
                                <div className="extra-row__info">
                                    <div className="extra-row__title-wrap">
                                        <span className="extra-row__title">{extra.name_es || extra.name}</span>

                                        {(extra.description || (extra as any).description_es) && (
                                            <div
                                                className="tooltip-wrapper"
                                                onMouseEnter={() => setOpenTooltipId(extra.id)}
                                                onMouseLeave={() =>
                                                    setOpenTooltipId((prev) => (prev === extra.id ? null : prev))
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setOpenTooltipId((prev) =>
                                                        prev === extra.id ? null : extra.id
                                                    )
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="info-icon-btn"
                                                    aria-label={`Más información sobre ${extra.name_es || extra.name}`}
                                                    aria-expanded={isTooltipOpen}
                                                >
                                                    <Info size={13} />
                                                </button>

                                                {isTooltipOpen && (
                                                    <div className="tooltip-bubble" role="tooltip">
                                                        {extra.description || (extra as any).description_es}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="extra-row__price-line">
                                        <span className="extra-row__price">{formatPrice(unitPrice)}</span>
                                        <span className="extra-row__unit">
                                            {isDaily ? `/día (${formatPrice(unitPrice * effectiveDays)} total)` : '/alquiler'}
                                        </span>
                                    </div>
                                </div>

                                <div className="extra-row__actions" onClick={(e) => e.stopPropagation()}>
                                    {selected ? (
                                        <div className="extra-qty-counter">
                                            <button
                                                type="button"
                                                className="qty-btn"
                                                onClick={(e) => handleQuantityChange(extra.id, -1, e)}
                                                aria-label="Restar unidad"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="qty-val">{qty}</span>
                                            <button
                                                type="button"
                                                className="qty-btn"
                                                onClick={(e) => handleQuantityChange(extra.id, 1, e)}
                                                aria-label="Sumar unidad"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn-add-compact"
                                            onClick={() => handleToggleExtra(extra)}
                                        >
                                            <Plus size={13} />
                                            <span>Añadir</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <style jsx>{`
                .step-extras {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4, 16px);
                }

                .step-header {
                    margin-bottom: 2px;
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--wz-pill-text);
                    background: var(--wz-pill-bg);
                    border: 1px solid var(--wz-pill-border);
                    padding: 2px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: 4px;
                }

                .step-header__title {
                    font-family: var(--font-display);
                    font-size: var(--text-xl, 20px);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin: 0;
                    line-height: 1.2;
                }

                /* Material Incluido */
                .included-block {
                    background: var(--wz-surface);
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-lg, 12px);
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .included-block__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .included-block__title {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--gray-600);
                }

                .included-block__badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 999px;
                    background: var(--wz-pill-bg);
                    color: var(--wz-pill-text);
                    border: 1px solid var(--wz-pill-border);
                }

                .included-chips {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    column-gap: 24px;
                    row-gap: 0;
                }

                .included-chip {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 12.5px;
                    color: var(--black-matte);
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0;
                    padding: 8px 0;
                }

                :global(.included-chip-icon) {
                    color: #d4a742;
                    flex-shrink: 0;
                }

                :global(html[data-theme="light"]) .included-chip {
                    border-bottom-color: rgba(26, 23, 20, 0.08);
                }

                :global(html[data-theme="light"]) :global(.included-chip-icon) {
                    color: #b38827;
                }

                @media (max-width: 640px) {
                    .included-chips {
                        grid-template-columns: 1fr;
                    }
                }

                /* Extras Comprimidos */
                .extras-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .extras-section__title {
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    color: var(--gray-600);
                    margin: 0;
                }

                .extras-compact-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                .extra-row {
                    background: var(--wz-surface);
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-md, 10px);
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.18s ease;
                    min-height: 48px;
                }

                .extra-row:hover {
                    border-color: var(--forest-green-light);
                }

                .extra-row--selected {
                    border-color: var(--forest-green);
                    background: var(--wz-pill-bg);
                }

                .extra-row__info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                    flex: 1;
                }

                .extra-row__title-wrap {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .extra-row__title {
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                    line-height: 1.25;
                }

                .tooltip-wrapper {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    flex-shrink: 0;
                }

                .info-icon-btn {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 1px solid var(--gray-300);
                    background: var(--wz-chip-bg);
                    color: var(--gray-600);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    padding: 0;
                    transition: all 0.15s ease;
                }

                .info-icon-btn:hover {
                    color: var(--forest-green);
                    border-color: var(--forest-green);
                }

                .tooltip-bubble {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 50%;
                    transform: translateX(-50%);
                    width: 230px;
                    background: var(--wz-surface);
                    border: 1px solid var(--forest-green);
                    color: var(--black-matte);
                    font-size: 11px;
                    font-weight: 500;
                    line-height: 1.45;
                    padding: 8px 10px;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                    z-index: 40;
                    pointer-events: none;
                }

                .extra-row__price-line {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                }

                .extra-row__price {
                    font-size: 12.5px;
                    font-weight: 800;
                    color: var(--forest-green);
                }

                .extra-row__unit {
                    font-size: 11px;
                    color: var(--gray-500);
                }

                .extra-row__actions {
                    flex-shrink: 0;
                }

                .btn-add-compact {
                    border: 1px solid var(--gray-300);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    font-size: 11.5px;
                    font-weight: 700;
                    padding: 6px 10px;
                    border-radius: var(--radius-sm, 7px);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.18s ease;
                    min-height: 32px;
                }

                .btn-add-compact:hover {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: var(--wz-on-accent);
                }

                .extra-qty-counter {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: var(--wz-surface);
                    border: 1px solid var(--forest-green);
                    border-radius: 999px;
                    padding: 2px 5px;
                }

                .qty-btn {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 1px solid var(--gray-200);
                    background: var(--wz-chip-bg);
                    color: var(--black-matte);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .qty-val {
                    font-size: 11.5px;
                    font-weight: 700;
                    color: var(--black-matte);
                    min-width: 14px;
                    text-align: center;
                }

                :global(.text-forest) {
                    color: var(--forest-green);
                    flex-shrink: 0;
                }

                @media (max-width: 860px) {
                    .extras-compact-grid {
                        grid-template-columns: 1fr;
                    }

                    .tooltip-bubble {
                        left: 0;
                        transform: none;
                    }
                }
            `}</style>
        </div>
    )
}
