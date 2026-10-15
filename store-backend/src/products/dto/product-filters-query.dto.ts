import { ProductScopeDto } from './product-scope.dto';

/**
 * پارامترهای GET /products/filters — فقط همان محدوده‌ی لیست محصولات
 * (platform و categorySlug) تا اعتبارسنجی هر دو یکسان باشد.
 */
export class ProductFiltersQueryDto extends ProductScopeDto {}
