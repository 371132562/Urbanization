// 数据管理API
export const dataManagementListByYear = '/dataManagement/listByYear'
export const dataManagementYears = '/dataManagement/years'
export const dataManagementCountriesByYears = '/dataManagement/countriesByYears'
export const dataManagementDetail = '/dataManagement/detail'
export const dataManagementCreate = '/dataManagement/create'
export const dataManagementBatchCreate = '/dataManagement/batchCreate'
export const dataManagementCheckExistingData = '/dataManagement/checkExistingData'
export const dataManagementBatchCheckExistingData = '/dataManagement/batchCheckExistingData'
export const dataManagementDelete = '/dataManagement/delete'
export const dataManagementExport = '/dataManagement/export'
export const dataManagementExportMultiYear = '/dataManagement/exportMultiYear'

// 指标API
export const indicatorHierarchy = '/indicator/indicatorsHierarchy'
export const updateIndicatorWeights = '/indicator/updateWeights'

// 国家与大洲API
export const continentList = '/countryAndContinent/continents'
export const countryList = '/countryAndContinent/countries'
export const urbanizationMap = '/countryAndContinent/urbanizationMap'
export const urbanizationUpdate = '/countryAndContinent/urbanizationUpdate'

// 文章管理API
export const articleList = '/article/list'
export const articleCreate = '/article/create'
export const articleUpdate = '/article/update'
export const articleDelete = '/article/delete'
export const articleDetail = '/article/detail'
export const articleListAll = '/article/listAll'
export const articleUpsertOrder = '/article/order'
export const articleGetByPage = '/article/getByPage'
export const articleGetDetailsByIds = '/article/getDetailsByIds'
export const articleCreateScoreStandard = '/article/createScoreStandard'
export const articleGetScoreStandard = '/article/getScoreStandard'

// 评分管理API
export const scoreCreate = '/score/create'
export const scoreBatchCreate = '/score/batchCreate'
export const scoreDetail = '/score/detail'
export const scoreDelete = '/score/delete'
export const scoreCheckExisting = '/score/checkExisting'
export const scoreBatchCheckExisting = '/score/batchCheckExisting'
export const scoreListByCountry = '/score/listByCountry'
export const scoreEvaluationList = '/score/listEvaluation'
export const scoreEvaluationCreate = '/score/createEvaluation'
export const scoreYears = '/score/years'
export const scoreListByYear = '/score/listByYear'
export const scoreListEvaluationDetailByYear = '/score/listEvaluationDetailByYear'
export const scoreEvaluationDetailGet = '/score/getEvaluationDetail'
export const scoreEvaluationDetailUpsert = '/score/upsertEvaluationDetail'
export const scoreEvaluationDetailDelete = '/score/deleteEvaluationDetail'
export const scoreCountriesByYears = '/score/countriesByYears'
export const scoreExportMultiYear = '/score/exportMultiYear'

// 角色管理API
export const roleListApi = '/role/list'
export const roleCreateApi = '/role/create'
export const roleUpdateApi = '/role/update'
export const roleDeleteApi = '/role/delete'
export const roleAssignRoutesApi = '/role/assignRoutes'

// 认证相关API地址
export const loginApiUrl = '/auth/login'
export const profileApiUrl = '/auth/profile'

// 用户管理API
export const userListApi = '/user/list'
export const userCreateApi = '/user/create'
export const userUpdateApi = '/user/update'
export const userDeleteApi = '/user/delete'
export const userResetPasswordApi = '/user/resetPassword'

// 系统维护（图片）API
export const listOrphanImagesApi = '/upload/maintenance/listOrphans'
export const deleteOrphanImagesApi = '/upload/maintenance/deleteOrphans'

// 系统日志API
export const systemLogsListFiles = '/system/logs/files'
export const systemLogsRead = '/system/logs/read'
export const systemUserLogsListFiles = '/system/logs/user/files'
export const systemUserLogsRead = '/system/logs/user/read'
export const systemUserLogsSearch = '/system/logs/user/search'
