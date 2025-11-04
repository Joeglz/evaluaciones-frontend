import React from 'react';

interface FieldErrorProps {
  errors?: string[];
}

const FieldError: React.FC<FieldErrorProps> = ({ errors }) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="field-error">
      {errors.map((error, index) => (
        <div key={index}>{error}</div>
      ))}
    </div>
  );
};

export default FieldError;
