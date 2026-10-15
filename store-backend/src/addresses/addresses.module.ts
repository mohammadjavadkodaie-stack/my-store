import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

// PrismaModule با @Global() تعریف شده؛ پس بدون import اضافه در دسترس است.
@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
