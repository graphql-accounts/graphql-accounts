import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  AfterLoad,
} from 'typeorm';
import { get, set } from 'lodash';
import { UserService } from './UserService';
import { UserEmail } from './UserEmail';
import { UserSession } from './UserSession';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @Column({ nullable: true })
  public username!: string;

  @OneToMany(() => UserService, (userService) => userService.user, { eager: true })
  public allServices!: UserService[];

  @OneToMany(() => UserEmail, (userEmail) => userEmail.user, { eager: true })
  public emails!: UserEmail[];

  @OneToMany(() => UserSession, (userSession) => userSession.user, { eager: true })
  public sessions!: UserSession[];

  @Column({ default: false })
  public deactivated!: boolean;

  @CreateDateColumn()
  public createdAt!: Date;

  @UpdateDateColumn()
  public updatedAt!: Date;

  public services: any = {};

  @AfterLoad()
  public async getServices() {
    this.services = (this.allServices || []).reduce((acc, service) => {
      if (['password.reset', 'email.verificationTokens'].includes(service.name)) {
        set(acc, service.name, [
          ...[].concat(get(acc, service.name, [])),
          { ...(service.token ? { token: service.token } : {}), ...service.options },
        ]);
      } else {
        set(acc, service.name, {
          ...(service.token ? { token: service.token } : {}),
          ...service.options,
        });
      }
      return acc;
    }, this.services);
  }
}
