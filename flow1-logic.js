// flow1-logic.js — Flow 1: GraphQL Client → Controller → UseCase → Domain

initFlowEngine([
  // [ADAPTER] — Request comes in
  {from:'client',to:'controller',label:'[ADAPTER] 1. Client sends GraphQL Query / Mutation to Controller',phase:'adapter'},
  {from:'controller',to:'mappingBox',label:'[ADAPTER] 2. Controller delegates to Adapter Mapping Pipeline (3+ params)',phase:'adapter'},
  {from:'reqDto',to:'webMapper',label:'[ADAPTER] 3. Request DTO passed to Web Mapper for transformation',phase:'adapter'},
  {from:'webMapper',to:'cmdObj',label:'[ADAPTER] 4. Web Mapper produces Command object (lives in Application layer)',phase:'adapter'},
  {from:'mappingBox',to:'controller',label:'[ADAPTER] 5. Controller receives Command back from pipeline',ret:true,phase:'adapter'},
  {from:'controller',to:'ucIface',label:'[ADAPTER] 6. Controller invokes UseCase Interface: execute(command)',phase:'adapter'},
  {from:'ucIface',to:'ucImpl',label:'[ADAPTER] 7. Interface → Impl resolved at runtime (Spring DI)',phase:'adapter'},

  // [LOAD] — Fetch existing aggregate
  {from:'ucImpl',to:'domRepoIface',label:'[LOAD] 8. UseCase extracts ID from Command → calls Repository: findById(id)',phase:'load'},
  {from:'domRepoIface',to:'repoImpl',label:'[LOAD] 9. Dependency Inversion: Domain Interface → Infra Impl',phase:'load'},
  {from:'repoImpl',to:'entRepo',label:'[LOAD] 10. Repo Impl calls Entity Repository: findById via R2DBC',phase:'load'},
  {from:'entRepo',to:'db',label:'[LOAD] 11. Entity Repository → PostgreSQL (non-blocking I/O)',phase:'load'},
  {from:'db',to:'entRepo',label:'[LOAD] 12. ← DB returns existing record',ret:true,phase:'load'},
  {from:'entRepo',to:'repoImpl',label:'[LOAD] 13. ← Entity Repository returns DB Entity',ret:true,phase:'load'},
  {from:'repoImpl',to:'infraMappingBox',label:'[LOAD] 14. Repo Impl delegates to Entity Mapping Pipeline',phase:'load'},
  {from:'entMapper',to:'dbEntity',label:'[LOAD] 15. Entity Mapper converts DB Entity → domain object',phase:'load'},
  {from:'infraMappingBox',to:'repoImpl',label:'[LOAD] 16. ← Repo Impl receives domain object',ret:true,phase:'load'},
  {from:'repoImpl',to:'domRepoIface',label:'[LOAD] 17. ← Returns Mono<Domain> through Repository Interface',ret:true,phase:'load'},
  {from:'domRepoIface',to:'ucImpl',label:'[LOAD] 18. ← Existing Aggregate returned to UseCase Impl',ret:true,phase:'load'},

  // [EXECUTE] — Business method + invariants
  {from:'ucImpl',to:'aggregate',label:'[EXECUTE] 19. UseCase calls business method on loaded Aggregate',phase:'execute'},
  {from:'aggregate',to:'domEx',label:'[EXECUTE] 20. ⚡ Aggregate self-validates — throws DomainException if rules violated',opt:true,phase:'execute'},

  // [SAVE] — Persist changes + domain events
  {from:'ucImpl',to:'domRepoIface',label:'[SAVE] 21. UseCase calls Repository Interface: save(aggregate)',phase:'save'},
  {from:'domRepoIface',to:'repoImpl',label:'[SAVE] 22. Dependency Inversion: Domain Interface → Infra Impl',phase:'save'},
  {from:'repoImpl',to:'infraMappingBox',label:'[SAVE] 23. Repo Impl delegates to Entity Mapping Pipeline',phase:'save'},
  {from:'entMapper',to:'dbEntity',label:'[SAVE] 24. Entity Mapper produces DB Entity (@Table, Persistable)',phase:'save'},
  {from:'infraMappingBox',to:'repoImpl',label:'[SAVE] 25. Repo Impl receives DB Entity back',ret:true,phase:'save'},
  {from:'repoImpl',to:'entRepo',label:'[SAVE] 26. Repo Impl calls Entity Repository: save(entity) via R2DBC',phase:'save'},
  {from:'entRepo',to:'db',label:'[SAVE] 27. Entity Repository → PostgreSQL (non-blocking I/O)',phase:'save'},
  {from:'db',to:'entRepo',label:'[SAVE] 28. ← DB confirms write',ret:true,phase:'save'},
  {from:'entRepo',to:'repoImpl',label:'[SAVE] 29. ← Entity Repository returns saved DB Entity',ret:true,phase:'save'},
  {from:'aggregate',to:'domEvent',label:'[SAVE] 30. Aggregate produced Domain Event during business method',opt:true,phase:'save'},
  {from:'domEvent',to:'kafkaProd',label:'[SAVE] 31. After commit — Infrastructure dispatches event to Kafka',opt:true,phase:'save'},
  {from:'repoImpl',to:'domRepoIface',label:'[SAVE] 32. ← Returns Mono<Domain> through Repository Interface',ret:true,phase:'save'},
  {from:'domRepoIface',to:'ucImpl',label:'[SAVE] 33. ← Saved domain object returned to UseCase Impl',ret:true,phase:'save'},

  // [RETURN] — Map to DTO, respond to client
  {from:'ucImpl',to:'domMappingBox',label:'[RETURN] 34. UseCase passes domain to Domain Mapping Pipeline → DTO',phase:'return'},
  {from:'aggregate',to:'appMapper',label:'[RETURN] 35. Aggregate / Domain Entity passed to App Mapper',phase:'return'},
  {from:'appMapper',to:'appDto',label:'[RETURN] 36. App Mapper produces Application DTO',phase:'return'},
  {from:'domMappingBox',to:'ucImpl',label:'[RETURN] 37. UseCase receives DTO back from pipeline',ret:true,phase:'return'},
  {from:'ucImpl',to:'ucIface',label:'[RETURN] 38. ← Impl returns Mono<DTO> through UseCase Interface',ret:true,phase:'return'},
  {from:'ucIface',to:'controller',label:'[RETURN] 39. ← Controller receives Mono<DTO> / Flux<DTO>',ret:true,phase:'return'},
  {from:'controller',to:'client',label:'[RETURN] 40. ← GraphQL Response sent to Client',ret:true,phase:'return'},

  // [ERROR] — Exception handling
  {from:'domEx',to:'errHandler',label:'[ERROR] 41. Exception caught by Error Handler',opt:true,phase:'error'},
  {from:'errHandler',to:'client',label:'[ERROR] 42. GraphQL error with extensions → Client',opt:true,ret:true,phase:'error'},
]);
