import { Select, Skeleton } from 'antd'
import { useEffect, useMemo } from 'react'
import type { CountryWithContinentDto } from 'urbanization-backend/types/dto'

import useCountryAndContinentStore from '@/stores/countryAndContinentStore'

const { Option, OptGroup } = Select

interface CountrySelectProps {
  value?: string | null
  onChange?: (value: string) => void
  disabled?: boolean
  style?: React.CSSProperties
}

const CountrySelect = ({ value, onChange, disabled, style }: CountrySelectProps) => {
  // --- CountryAndContinent Store ---
  const continents = useCountryAndContinentStore(state => state.continents)
  const countries = useCountryAndContinentStore(state => state.countries)
  const continentsLoading = useCountryAndContinentStore(state => state.continentsLoading)
  const countriesLoading = useCountryAndContinentStore(state => state.countriesLoading)
  const getContinents = useCountryAndContinentStore(state => state.getContinents)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)

  // 加载大洲和国家数据
  useEffect(() => {
    getContinents(true) // 获取大洲数据，并包含国家
    getCountries({ includeContinent: true }) // 获取所有国家数据，包含大洲信息
  }, [getContinents, getCountries])

  // 按大洲组织国家列表
  const countryOptions = useMemo(() => {
    // 创建一个Map，将国家按大洲ID分组
    const countriesByContinent = new Map<string, CountryWithContinentDto[]>()

    countries.forEach(country => {
      if (country.continentId) {
        if (!countriesByContinent.has(country.continentId)) {
          countriesByContinent.set(country.continentId, [])
        }
        countriesByContinent.get(country.continentId)!.push(country)
      }
    })

    // 返回按大洲分组的国家选项
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
  }, [continents, countries])

  if (countriesLoading || continentsLoading) {
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
      placeholder="请选择国家"
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
