import React from 'react';
import { Input } from '@/components/ui/input';
import { applyMask } from '@/lib/masks';

/**
 * Input com máscara BR (phone, whatsapp, cpf, cnpj, cep).
 */
export default function MaskedInput({
  mask = 'phone',
  value = '',
  onChange,
  ...props
}) {
  const display = applyMask(mask, value);

  const handleChange = (e) => {
    const masked = applyMask(mask, e.target.value);
    if (typeof onChange === 'function') {
      // Compatível com handlers que esperam event ou valor direto
      onChange({
        ...e,
        target: { ...e.target, value: masked },
      });
    }
  };

  return (
    <Input
      {...props}
      value={display}
      onChange={handleChange}
      inputMode={mask === 'cep' || mask === 'cpf' || mask === 'cnpj' || mask === 'phone' || mask === 'whatsapp' || mask === 'telefone' ? 'numeric' : props.inputMode}
    />
  );
}
