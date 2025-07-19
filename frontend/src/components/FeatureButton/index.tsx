import { ArrowRightOutlined } from '@ant-design/icons'
import { cloneElement, FC, isValidElement, ReactNode } from 'react'

import { hexToRgba } from '@/utils'

type FeatureButtonProps = {
  icon: ReactNode
  title: string
  description: string
  actionText: string
  onClick: () => void
  className?: string
  color?: string
}

const FeatureButton: FC<FeatureButtonProps> = ({
  title,
  description,
  actionText,
  onClick,
  icon,
  className,
  color
}) => {
  const themeColor = color || '#1677ff' // Default to Ant Design blue
  const iconBgColor = hexToRgba(themeColor, 0.1)

  const styledIcon =
    icon && isValidElement(icon)
      ? cloneElement(icon as React.ReactElement, {
          style: {
            ...icon.props.style,
            color: themeColor,
            fontSize: '24px'
          }
        })
      : null

  return (
    <div
      onClick={onClick}
      className={`group flex h-[220px] w-80 cursor-pointer flex-col justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${className || ''} `}
    >
      <div>
        <div className="mb-4 flex items-center">
          {styledIcon && (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: iconBgColor }}
            >
              {styledIcon}
            </div>
          )}
          <div className={`text-2xl text-gray-800 ${icon ? 'ml-3' : ''}`}>{title}</div>
        </div>
        <div className="flex-grow text-base leading-relaxed text-gray-500">{description}</div>
      </div>
      <div
        className="mt-4 flex items-center text-lg font-medium"
        style={{ color: themeColor }}
      >
        <span>{actionText}</span>
        <ArrowRightOutlined className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  )
}

export default FeatureButton
