import { Injectable } from '@nestjs/common';
import * as lowdb from 'lowdb';
import * as FileAsync from 'lowdb/adapters/FileAsync';

@Injectable()
export class LowdbService {
  private db: lowdb.LowdbAsync<any>;

  public async initDatabase(file: string) {
    const adapter = new FileAsync(file);
    this.db = await lowdb(adapter);
  }

  public getDb() {
    return this.db;
  }

  async findAll(collctionName: string): Promise<any> {
    const listData = await this.db.get(collctionName).value();
    return listData;
  }

  async find(condition: any, collctionName: string): Promise<any> {
    const values = await this.db.get(collctionName).find(condition).value();
    return values;
  }

  async update(
    key: string,
    value: string,
    collctionName: string,
    dataUpdate: any,
  ): Promise<any> {
    const listData = await this.db.get(collctionName).value();
    let out;
    const listDataMap = listData.map((data) => {
      if (data[key] !== value) return data;
      if (data[key] === value) {
        out = Object.assign(data, dataUpdate);
        return out;
      }
    });
    await this.db.set(collctionName, listDataMap).write();
    return out;
  }

  async add(data: any, collctionName: string): Promise<any> {
    const listData:any[] = await this.db.get(collctionName).value();
    listData.unshift(data);
    await this.db.set(collctionName, listData).write();
    return data;
  }

  async delete(condition: any, collctionName: string): Promise<any> {
    await this.db.get(collctionName).remove(condition).write();

    return true;
  }
}
