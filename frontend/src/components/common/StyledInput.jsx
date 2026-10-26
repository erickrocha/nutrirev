import React, {useState} from 'react';

export const StyledInput = ({
                                type = 'text',
                                value,
                                onChange,
                                placeholder = '',
                                disabled = false,
                                style = {},
                                ...props
                            }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div
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
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#FFFFFF',
                    border: isFocused ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: disabled ? 'not-allowed' : 'text',
                    boxShadow: isFocused ? '0 0 0 2px rgba(29, 111, 209, 0.15)' : 'none',
                    transition: 'all 0.2s ease-in-out',
                    boxSizing: 'border-box',
                    ...style,
                }}
            >
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '0.85rem',
                        color: 'var(--text-heading)',
                        padding: 0,
                        margin: 0,
                        height: '20px',
                    }}
                    {...props}
                />
            </div>
        </div>
    );
};
