'use client'

import React, { useState } from 'react'
import {
    Sparkles,
    Waves,
    Wifi,
    Bike,
    Coffee,
    BedDouble,
    Utensils,
    Flame,
    Tv,
    Umbrella,
    Plus,
    Minus,
    Check,
    CheckCircle2,
    Compass,
    SlidersHorizontal,
} from 'lucide-react'
import { Step4Data, SelectedWizardExtra, WizardExtraItem } from './types'
import { formatPrice } from '@/lib/pricing/engine'

interface Step4ExtrasProps {
    data: Step4Data
    availableExtras: WizardExtraItem[]
    totalDays: number
    onChange: (data: Step4Data) => void
}

const CATEGORIES = ['Todos', 'Equipamiento', 'Deporte', 'Confort'] as const
type CategoryFilter = typeof CATEGORIES[number]

function getExtraIcon(name: string, category: string) {
    const lower = name.toLowerCase()
    if (lower.includes('paddle') || lower.includes('sup') || lower.includes('surf')) return <Waves size={20} />
    if (lower.includes('snorkel') || lower.includes('buceo')) return <Waves size={20} />
    if (lower.includes('bici') || lower.includes('bicicleta') || lower.includes('portabicicletas')) return <Bike size={20} />
    if (lower.includes('wifi') || lower.includes('4g') || lower.includes('internet')) return <Wifi size={20} />
    if (lower.includes('cafetera') || lower.includes('café')) return <Coffee size={20} />
    if (lower.includes('cama') || lower.includes('nórdico') || lower.includes('toalla')) return <BedDouble size={20} />
    if (lower.includes('cocina') || lower.includes('silla') || lower.includes('mesa')) return <Utensils size={20} />
    if (lower.includes('barbacoa') || lower.includes('bbq') || lower.includes('gas')) return <Flame size={20} />
    if (lower.includes('cine') || lower.includes('proyector')) return <Tv size={20} />
    if (lower.includes('sombrilla') || lower.includes('toldo')) return <Umbrella size={20} />
    if (category === 'Deporte') return <Compass size={20} />
    return <Sparkles size={20} />
}

export default function Step4Extras({
    data,
    availableExtras,
    totalDays,
    onChange,
}: Step4ExtrasProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('Todos')
    const effectiveDays = Math.max(1, totalDays || 1)

    // Extras de catálogo por defecto si Supabase no tiene aún o están vacíos
    const fallbackExtras: WizardExtraItem[] = [
        {
            id: 'extra-paddle-surf',
            name_es: 'Tabla Paddle Surf (SUP) hinchable',
            category: 'Deporte',
            price: 45,
            price_type: 'per_rental',
            description: 'Pack completo con remo telescópico, quilla, hinchador de doble acción y mochila de transporte.',
        },
        {
            id: 'extra-wifi-unlimited',
            name_es: 'Wi-Fi 4G Portátil con Datos Ilimitados',
            category: 'Confort',
            price: 5,
            price_type: 'per_day',
            description: 'Módem MiFi autónomo con batería de 12 horas y cobertura 4G/5G en calas y fondeaderos.',
        },
        {
            id: 'extra-bike-rack',
            name_es: 'Portabicicletas trasero para 2 bicis',
            category: 'Deporte',
            price: 40,
            price_type: 'per_rental',
            description: 'Soporte homologado Thule fijado sobre portón trasero, compatible con e-bikes.',
        },
        {
            id: 'extra-cine-pack',
            name_es: 'Pack Cine Bajo las Estrellas',
            category: 'Confort',
            price: 35,
            price_type: 'per_rental',
            description: 'Mini proyector HD con batería integrada, trípode articulado y pantalla enrollable de 60".',
        },
        {
            id: 'extra-gas-bbq',
            name_es: 'Kit Barbacoa Portátil de Gas',
            category: 'Equipamiento',
            price: 30,
            price_type: 'per_rental',
            description: 'Plancha portátil de gas con cartuchos de recambio, pinzas y set de limpieza.',
        },
        {
            id: 'extra-snorkel-premium',
            name_es: 'Kit Snorkel Pro con Aletas',
            category: 'Deporte',
            price: 25,
            price_type: 'per_rental',
            description: 'Máscara panorámica antivaho, tubo seco, aletas ajustables y bolsa estanca de 10L.',
        },
        {
            id: 'extra-chairs-extra',
            name_es: 'Sillas de exterior adicionales (Pack 2)',
            category: 'Equipamiento',
            price: 15,
            price_type: 'per_rental',
            description: 'Dos sillas plegables ultraligeras de aluminio adicionales para invitados.',
        },
        {
            id: 'extra-bedding-extra',
            name_es: 'Juego nórdico de sábanas y toallas extra',
            category: 'Confort',
            price: 20,
            price_type: 'per_rental',
            description: 'Set completo de algodón 100% orgánico y toallas de baño para cambio a mitad de viaje.',
        },
    ]

    const effectiveCatalog: WizardExtraItem[] = availableExtras && availableExtras.length > 0
        ? availableExtras
        : fallbackExtras

    const filteredCatalog = activeCategory === 'Todos'
        ? effectiveCatalog
        : effectiveCatalog.filter((e) => (e.category || 'Equipamiento') === activeCategory)

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
                <span className="step-header__tag">PASO 4 DE 5</span>
                <h2 className="step-header__title">Personaliza tu aventura con experiencias y extras</h2>
                <p className="step-header__desc">
                    Añade equipamiento opcional para exprimir al máximo tus días en Mallorca: paddle surf, wifi ilimitado para teletrabajar, proyector de cine o menaje ampliado.
                </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="category-tabs">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        className={`cat-pill ${activeCategory === cat ? 'cat-pill--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Extras Grid */}
            <div className="extras-grid">
                {filteredCatalog.map((extra) => {
                    const selected = isSelected(extra.id)
                    const qty = getSelectedQuantity(extra.id)
                    const unitPrice = Number(extra.price) || 0
                    const isDaily = extra.price_type === 'per_day'
                    const computedTotal = isDaily
                        ? unitPrice * effectiveDays * Math.max(1, qty || 1)
                        : unitPrice * Math.max(1, qty || 1)

                    return (
                        <div
                            key={extra.id}
                            className={`extra-card ${selected ? 'extra-card--selected' : ''}`}
                            onClick={() => handleToggleExtra(extra)}
                        >
                            <div className="extra-card__top">
                                <div className="extra-card__icon-box">
                                    {getExtraIcon(extra.name_es, extra.category || '')}
                                </div>
                                <span className="extra-card__category-tag">
                                    {extra.category || 'Equipamiento'}
                                </span>
                            </div>

                            <div className="extra-card__body">
                                <h4 className="extra-card__title">{extra.name_es}</h4>
                                {extra.description && (
                                    <p className="extra-card__description">{extra.description}</p>
                                )}

                                <div className="extra-card__pricing">
                                    <div className="extra-card__price-line">
                                        <span className="extra-card__price-amount">
                                            {formatPrice(unitPrice)}
                                        </span>
                                        <span className="extra-card__price-type">
                                            {isDaily ? '/ día' : '/ alquiler'}
                                        </span>
                                    </div>
                                    {isDaily && (
                                        <span className="extra-card__total-calc">
                                            Total: {formatPrice(unitPrice * effectiveDays)} ({effectiveDays} días)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="extra-card__footer" onClick={(e) => e.stopPropagation()}>
                                {selected ? (
                                    <div className="extra-selected-controls">
                                        <div className="extra-qty-counter">
                                            <button
                                                type="button"
                                                className="qty-btn"
                                                onClick={(e) => handleQuantityChange(extra.id, -1, e)}
                                                title="Quitar uno"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="qty-val">{qty}</span>
                                            <button
                                                type="button"
                                                className="qty-btn"
                                                onClick={(e) => handleQuantityChange(extra.id, 1, e)}
                                                title="Añadir otro"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-remove-extra"
                                            onClick={() => handleToggleExtra(extra)}
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-add-extra"
                                        onClick={() => handleToggleExtra(extra)}
                                    >
                                        <Plus size={14} />
                                        <span>Añadir al viaje</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <style jsx>{`
                .step-extras {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .step-header {
                    margin-bottom: var(--space-2);
                }

                .step-header__tag {
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: var(--forest-green);
                    background: rgba(45, 58, 45, 0.08);
                    padding: 3px 8px;
                    border-radius: var(--radius-sm);
                    margin-bottom: var(--space-2);
                }

                .step-header__title {
                    font-family: var(--font-display);
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: var(--space-2);
                    line-height: 1.25;
                }

                .step-header__desc {
                    font-size: var(--text-sm);
                    color: var(--gray-600);
                    line-height: 1.6;
                }

                .category-tabs {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }

                .cat-pill {
                    border: 1px solid var(--gray-200);
                    background: #ffffff;
                    color: var(--gray-600);
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 14px;
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .cat-pill:hover {
                    border-color: var(--forest-green);
                    color: var(--black-matte);
                }

                .cat-pill--active {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: #ffffff;
                }

                .extras-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--space-4);
                }

                .extra-card {
                    background: #ffffff;
                    border: 1.5px solid var(--gray-200);
                    border-radius: var(--radius-xl);
                    padding: var(--space-4);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .extra-card:hover {
                    border-color: var(--forest-green-light);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
                }

                .extra-card--selected {
                    border-color: var(--forest-green);
                    background: #ffffff;
                    box-shadow: 0 0 0 2px rgba(45, 58, 45, 0.15), 0 6px 20px rgba(45, 58, 45, 0.05);
                }

                .extra-card__top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-3);
                }

                .extra-card__icon-box {
                    width: 38px;
                    height: 38px;
                    border-radius: var(--radius-md);
                    background: rgba(45, 58, 45, 0.06);
                    color: var(--forest-green);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .extra-card--selected .extra-card__icon-box {
                    background: var(--forest-green);
                    color: #ffffff;
                }

                .extra-card__category-tag {
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    color: var(--gray-500);
                    background: rgba(0, 0, 0, 0.04);
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                }

                .extra-card__body {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: var(--space-3);
                }

                .extra-card__title {
                    font-size: var(--text-sm);
                    font-weight: 700;
                    color: var(--black-matte);
                    margin-bottom: 4px;
                    line-height: 1.35;
                }

                .extra-card__description {
                    font-size: 11px;
                    color: var(--gray-600);
                    line-height: 1.5;
                    margin-bottom: var(--space-3);
                    flex: 1;
                }

                .extra-card__pricing {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .extra-card__price-line {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                }

                .extra-card__price-amount {
                    font-size: var(--text-lg);
                    font-weight: 700;
                    color: var(--forest-green);
                }

                .extra-card__price-type {
                    font-size: 11px;
                    color: var(--gray-500);
                    font-weight: 500;
                }

                .extra-card__total-calc {
                    font-size: 10px;
                    color: var(--gray-500);
                }

                .extra-card__footer {
                    border-top: 1px solid var(--gray-100);
                    padding-top: var(--space-3);
                }

                .btn-add-extra {
                    width: 100%;
                    border: 1px solid var(--gray-300);
                    background: #ffffff;
                    color: var(--black-matte);
                    font-size: 12px;
                    font-weight: 600;
                    padding: 8px 12px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }

                .btn-add-extra:hover {
                    background: var(--forest-green);
                    border-color: var(--forest-green);
                    color: #ffffff;
                }

                .extra-selected-controls {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .extra-qty-counter {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #faf8f5;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--radius-full);
                    padding: 2px 6px;
                }

                .qty-btn {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: none;
                    background: #ffffff;
                    color: var(--black-matte);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
                }

                .qty-val {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--black-matte);
                    min-width: 16px;
                    text-align: center;
                }

                .btn-remove-extra {
                    border: none;
                    background: transparent;
                    color: var(--error);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px;
                }

                .btn-remove-extra:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    )
}
