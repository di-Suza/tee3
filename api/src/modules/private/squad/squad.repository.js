import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';

class SquadRepository extends ScaffoldRepository {
  constructor() {
    super('squad');
  }
}

export { SquadRepository };
export default new SquadRepository();
