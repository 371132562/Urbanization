/* 全部国家选择器 */
import { Select, Skeleton } from 'antd'
import { useEffect, useMemo } from 'react'
import type { Country, CountryData, CountryWithContinentDto } from 'urbanization-backend/types/dto'

import useCountryAndContinentStore from '@/stores/countryAndContinentStore'

const { Option, OptGroup } = Select

interface CountrySelectProps {
  value?: string | string[] | null
  onChange?: (value: string | string[]) => void
  disabled?: boolean
  style?: React.CSSProperties
  mode?: 'multiple' | 'tags'
  placeholder?: string
  options?: (Country | CountryData)[] // 外部传入的国家选项
}

const CountrySelect = ({
  value,
  onChange,
  disabled,
  style,
  mode,
  placeholder = '请选择国家',
  options
}: CountrySelectProps) => {
  // --- CountryAndContinent Store ---
  const continents = useCountryAndContinentStore(state => state.continents)
  const countries = useCountryAndContinentStore(state => state.countries)
  const continentsLoading = useCountryAndContinentStore(state => state.continentsLoading)
  const countriesLoading = useCountryAndContinentStore(state => state.countriesLoading)
  const getContinents = useCountryAndContinentStore(state => state.getContinents)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)

  // 仅在未提供外部options时加载内部数据
  useEffect(() => {
    if (!options) {
      getContinents(true) // 获取大洲数据，并包含国家
      getCountries({ includeContinent: true }) // 获取所有国家数据，包含大洲信息
    }
  }, [getContinents, getCountries, options])

  // 按大洲组织国家列表
  const countryOptions = useMemo(() => {
    const sourceCountries = options || countries

    // 如果是外部传入的options，则直接返回，不需要按大洲分组
    if (options) {
      return options.map(country => (
        <Option
          key={country.id}
          value={country.id}
          label={country.cnName}
          data-en-name={country.enName} // 添加英文名作为data属性
        >
          <div className="flex items-center">
            <span>{country.cnName}</span>
            <span className="ml-2 text-xs text-gray-400">({country.enName})</span>
          </div>
        </Option>
      ))
    }

    // --- 以下是用于处理内部获取的数据 ---
    const countriesByContinent = new Map<string, CountryWithContinentDto[]>()
    sourceCountries.forEach(country => {
      // 类型守卫，确保country是CountryWithContinentDto类型
      if ('continentId' in country && country.continentId) {
        if (!countriesByContinent.has(country.continentId)) {
          countriesByContinent.set(country.continentId, [])
        }
        countriesByContinent.get(country.continentId)!.push(country)
      }
    })

    return continents.map(continent => (
      <OptGroup
        key={continent.id}
        label={continent.cnName}
      >
        {(countriesByContinent.get(continent.id) || []).map(country => (
          <Option
            key={country.id}
            value={country.id}
            label={country.cnName}
            data-en-name={country.enName} // 添加英文名作为data属性
          >
            <div className="flex items-center">
              <span>{country.cnName}</span>
              <span className="ml-2 text-xs text-gray-400">({country.enName})</span>
            </div>
          </Option>
        ))}
      </OptGroup>
    ))
  }, [continents, countries, options])

  if (!options && (countriesLoading || continentsLoading)) {
    return (
      <Skeleton.Input
        active
        style={{ width: '100%', height: 32, ...style }}
      />
    )
  }

  return (
    <Select
      showSearch
      mode={mode}
      placeholder={placeholder}
      allowClear={mode === 'multiple'}
      style={{ width: '100%', ...style }}
      value={value}
      onChange={onChange}
      disabled={disabled}
      filterOption={(input, option) => {
        const label = option?.label?.toString().toLowerCase() || ''
        const enName = option?.['data-en-name']?.toLowerCase() || ''
        const search = input.toLowerCase()
        return label.includes(search) || enName.includes(search)
      }}
      optionFilterProp="label"
      className="text-left"
    >
      {countryOptions}
    </Select>
  )
}

export default CountrySelect
