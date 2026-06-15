import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { AccountsModule } from './accounts/accounts.module';
import { BudgetsModule } from './budgets/budgets.module';
import { SplitsModule } from './splits/splits.module';
import { SettlementsModule } from './settlements/settlements.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { AssistantModule } from './assistant/assistant.module';
import { MeModule } from './me/me.module';
import { PeopleModule } from './people/people.module';
import { RecapsModule } from './recaps/recaps.module';

@Module({
  imports: [
    DbModule,
    TransactionsModule,
    CategoriesModule,
    AccountsModule,
    BudgetsModule,
    SplitsModule,
    SettlementsModule,
    ReceiptsModule,
    AssistantModule,
    MeModule,
    PeopleModule,
    RecapsModule,
  ],
})
export class AppModule {}
