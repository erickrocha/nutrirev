import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check, Heart } from 'lucide-react';

export const FilterableMultiSelect = ({
  label = 'Condições Pré-Existentes',
  icon: Icon = Heart,
  iconColor = '#D97706',
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Selecione...',
  emptyMessage = 'Nenhuma opção encontrada.',
  isSingleSelect = false,
  showSearch = true,
  disabled = false,
  isClearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [portalStyle, setPortalStyle] = useState({});

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Calculate dropdown position relative to viewport so it floats cleanly via Portal
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedDropdownHeight = 260; // Estimated height of options panel

    let topPos = rect.bottom + 4;
    // If not enough space below, open upward
    if (spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
      topPos = Math.max(10, rect.top - estimatedDropdownHeight - 4);
    }

    setPortalStyle({
      position: 'fixed',
      top: `${topPos}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      boxSizing: 'border-box',
      zIndex: 999999,
    });
  }, []);

  // Update position when opening, resizing, or scrolling
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true); // capture phase to handle modal scroll

      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Close dropdown when clicking outside trigger or dropdown portal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isIdSelected = useCallback(
    (id) => selectedIds.some((sid) => String(sid) === String(id)),
    [selectedIds]
  );

  const filteredOptions = options.filter((opt) =>
    (opt.name || '').toLowerCase().includes(filterText.toLowerCase())
  );

  const selectedOptions = options.filter((opt) => isIdSelected(opt.id));

  const handleToggleOption = (id) => {
    if (isSingleSelect) {
      if (isIdSelected(id)) {
        onChange([]);
      } else {
        onChange([id]);
      }
      setIsOpen(false);
    } else {
      if (isIdSelected(id)) {
        onChange(selectedIds.filter((item) => String(item) !== String(id)));
      } else {
        onChange([...selectedIds, id]);
      }
    }
  };

  const handleRemoveTag = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => String(item) !== String(id)));
  };

  const handleSelectAll = () => {
    if (isSingleSelect) return;
    const allIds = options.map((opt) => opt.id);
    onChange(allIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '10px 12px',
        background: '#FAF9F6',
        boxSizing: 'border-box',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {/* Label / Header */}
      {label && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
            boxSizing: 'border-box',
          }}
        >
          <label
            style={{
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: 0,
              color: 'var(--text-heading)',
            }}
          >
            {Icon && <Icon size={14} style={{ color: iconColor }} />}
            <span>{label}</span>
          </label>

          {!isSingleSelect && selectedIds.length > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--badge-bg)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Selected Tags Display (Multi-select mode only) */}
      {!isSingleSelect && selectedOptions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px',
            maxHeight: '80px',
            overflowY: 'auto',
            padding: '2px',
            boxSizing: 'border-box',
          }}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '3px 8px 3px 10px',
                fontSize: '0.78rem',
                color: 'var(--text-heading)',
                fontWeight: '500',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                boxSizing: 'border-box',
              }}
            >
              {opt.name}
              <button
                type="button"
                onClick={(e) => handleRemoveTag(e, opt.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-body)',
                  borderRadius: '50%',
                }}
                title="Remover"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger Box / Input Control */}
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          backgroundColor: '#FFFFFF',
          border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 2px rgba(29, 111, 209, 0.15)' : 'none',
          transition: 'all 0.2s ease-in-out',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize: '0.85rem',
            color: selectedIds.length > 0 ? 'var(--text-heading)' : '#888888',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selectedIds.length === 0
            ? placeholder
            : isSingleSelect
            ? selectedOptions[0]?.name || placeholder
            : `${selectedIds.length} item(ns) selecionado(s)`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isClearable && selectedIds.length > 0 && !disabled && (
            <X
              size={14}
              style={{
                color: 'var(--text-body)',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              title="Limpar seleção"
            />
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-body)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Floating Dropdown Overlay rendered via React Portal */}
      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              ...portalStyle,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            {/* Search Filter Box */}
            {showSearch && (
              <div
                style={{
                  position: 'relative',
                  marginBottom: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 28px 6px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backgroundColor: '#FAF9F6',
                  }}
                  autoFocus
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#888',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Quick Actions (Select All / Clear) */}
            {!isSingleSelect && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px 8px 6px',
                  borderBottom: '1px solid #F1F5F9',
                  marginBottom: '6px',
                  fontSize: '0.75rem',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ color: '#888' }}>
                  {filteredOptions.length} de {options.length} opções
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      padding: 0,
                    }}
                  >
                    Selecionar Todos
                  </button>
                  <span style={{ color: 'var(--text-body)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#E11D48',
                      cursor: 'pointer',
                      fontWeight: '600',
                      padding: 0,
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                boxSizing: 'border-box',
              }}
            >
              {filteredOptions.length === 0 ? (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: '#888',
                  }}
                >
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = isIdSelected(opt.id);
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 8px',
                        borderRadius: '5px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--bg-alt)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                        userSelect: 'none',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isSelected ? '#FDFBF7' : 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: isSingleSelect ? '50%' : '4px',
                          border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <Check size={12} style={{ color: '#FFFFFF' }} />}
                      </div>
                      <input
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        checked={isSelected}
                        onChange={() => handleToggleOption(opt.id)}
                        style={{ display: 'none' }}
                      />
                      <span
                        style={{
                          color: isSelected ? 'var(--text-heading)' : '#475569',
                          fontWeight: isSelected ? '600' : '400',
                          wordBreak: 'break-word',
                        }}
                      >
                        {opt.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
