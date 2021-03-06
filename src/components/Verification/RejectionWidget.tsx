import React from 'react';

interface RejectionWidgetProps {
  text: string;
}

export const RejectionWidget: React.SFC<RejectionWidgetProps> = ({text}) => {
  if (!text) {
    return null;
  }
  return <div className="alert rejection-widget">{text}</div>;
};

export default RejectionWidget;
