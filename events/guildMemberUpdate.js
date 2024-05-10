const { Events } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('node:path');

const sequelize = new Sequelize(
	process.env.DATABASE_NAME,
	process.env.DATABASE_USER,
	process.env.DATABASE_PW,
	{
		host: process.env.DATABASE_HOST,
		dialect: 'mysql',
	},
);

module.exports = {
	name: Events.GuildMemberUpdate,
	async execute(oldMember, newMember) {
		const oldRoles = await oldMember.roles.cache;
		const newRoles = await newMember.roles.cache;
		const Member = require('.././sequilize/members')(sequelize, DataTypes);
		const Character = require('.././sequilize/characters')(sequelize, DataTypes);
		const DopePoints = require('.././sequilize/dope_points')(sequelize, DataTypes);

		Member.hasOne(DopePoints);
		DopePoints.belongsTo(Member);

		const oldHasGuildRole = oldRoles.has(process.env.GUILD_ROLE_ID);
		const oldHasGuildTestRole = oldRoles.has(process.env.GUILD_TEST_ROLE_ID);
		const newHasGuildRole = newRoles.has(process.env.GUILD_ROLE_ID);
		const newHasGuildTestRole = newRoles.has(process.env.GUILD_TEST_ROLE_ID);

		const oldHasVerifiedRole = oldRoles.has(process.env.VERIFIED_ROLE_ID);
		const newHasVerifiedRole = newRoles.has(process.env.VERIFIED_ROLE_ID);

		// Mitglied aus Gilde entfernt
		if ((oldHasGuildRole || oldHasGuildTestRole) && (!newHasGuildRole && !newHasGuildTestRole)) {
			try {
				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: newMember.user.username,
						},
					},
				});

				// Member inaktiv setzen.
				if (member !== null) {
					await member.update({
						is_active: false,
					});

					const memberChannel = oldMember.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

					const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
					await thread.setArchived(true);
				}
			}
			catch (e) {
				console.log('30' + e);
			}
		}
		else if ((!oldHasGuildRole && !oldHasGuildTestRole) && (newHasGuildRole || newHasGuildTestRole)) {
			try {
				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: newMember.user.username,
						},
					},
				});

				const memberChannel = oldMember.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

				// Wenn Member nur inaktiv setz aktiv, sonst erstell Eintrag in Memberliste
				if (member !== null) {
					await member.update({
						is_active: true,
					});

					const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
					await thread.setArchived(false);
				}
				else {
					Member.hasMany(Character);
					Character.belongsTo(Member);
					const memberProfilePost = await memberChannel.threads.create({ name: newMember.user.globalName + ' - (' + newMember.user.username + ')', message: { content: 'Profile in making.' } });

					const memberCreated = await Member.create({
						discord_name: newMember.user.username,
						discord_global_name: newMember.user.globalName ?? newMember.user.username,
						member_since: (new Date()).toLocaleString('de-DE', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						}),
						is_active: true,
						characters: {
							character_name: '-',
							is_main: true,
							is_guild: true,
						},
						member_profile_post_id: memberProfilePost.id,
					}, {
						include: [Character],
					});

					const memberProfileEmbed = require(path.join(__dirname, 'embeds/memberProfileEmbed.js'));
					const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(memberCreated);

					const profileButtonsRow = require(path.join(__dirname, 'actionrows/profileButtonsRow.js'));
					const profileButtonsRowCreated = await profileButtonsRow.rowCreate(memberCreated, newMember.guild);

					const dopePointsEmbed = require(path.join(__dirname, 'embeds/dopePointsEmbed.js'));
					const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(memberCreated, DopePoints);

					const messages = await memberProfilePost.messages.fetch();

					await messages.values().next().value.edit({ content: ' ', embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

					await memberProfilePost.members.add(newMember.user.id);
				}
			}
			catch (e) {
				console.log('31' + e);
			}
		}
		else if ((!oldHasVerifiedRole) && newHasVerifiedRole) {
			try {
				if (newRoles.has(process.env.GERMAN_ROLE_ID)) {
					newMember.send({
						content: `Hey <@${newMember.id}>,\nherzlich willkommen in unserer Gilde! Wir freuen uns, dich bei uns begrüßen zu dürfen.\nWir möchten dich gerne über unser internes Gildensystem informieren und dir die Funktionen einiger Discord-Channel näherbringen.\n\n**__Gildenbeitrag:__**\nJedes Mitglied entrichtet wöchentlich einen Beitrag von 25 Punkten, die als interne Währung dienen und für verschiedene Zwecke innerhalb der Gilde verwendet werden. Solltest du nicht genügend Punkte haben, wird die Differenz mit Yang ausgeglichen.\n\n**__Erwirtschaftung der Punkte:__**\nErfolgreiche Teilnahme an der Eishexe: 5 Punkte (Nur angemeldete User erhalten ihre Punkte)\nErfolgreiche PvP-Aktivitäten an der Eishexe: 2 Punkte (Nur angemeldete User erhalten ihre Punkte)\nAbgabe von Relikten: 1 Punkt\nSpenden von 1kk Yang an die Gilde: 1 Punkt\nBeitrag durch Guides, Übersetzungen und Tabellen: Die Anzahl der Punkte variiert je nach Umfang und Qualität der Arbeit.\n\n**__Anmeldung der Eishexe:__**\nIm Kanal "Boss-Timer" kannst du dich mit deinem Schaden für die Eishexe registrieren. Eine doppelte Anmeldung ist möglich, solltest du mit 2 Chars kommen wollen.\n\n**__Verwendung der Punkte:__**\nZahlung des Gildenbeitrags\nTausch gegen Relikte\n\n**__Verwendung des Yang:__**\nGildenplatzmiete\nGilden-NPC\nKommende Gildenupdates\nGildenausrüstung (bspw. EXP-Gürtel)\n\nBei Fragen stehen wir dir jederzeit gerne zur Verfügung.\nViel Spaß und Erfolg in unserer Gilde!`,
					});
				}
				else if (newRoles.has(process.env.ENGLISH_ROLE_ID)) {
					newMember.send({
						content: `Hey <@${newMember.id}>,\nwelcome to our guild! We are happy to welcome you to our guild.\n\nWe would like to inform you about our internal guild system and introduce you to the functions of some Discord channels.\n\n**__Guild contribution:__**\nEvery member pays a weekly contribution of 25 points, which serve as internal currency and are used for various purposes within the guild. If you do not have enough points, the difference will be made up with Yang.\n\n**__Earning the points:__**\nSuccessful participation in the Ice Witch: 5 points (Only registered users receive their points)\nSuccessful PvP activities at the Ice Witch: 2 points (only registered users receive their points)\nHanding in relics: 1 point\nDonations of 1kk Yang to the guild: 1 point\nContribution through guides, translations and tables: The number of points varies depending on the amount and quality of work.\n\n**__Registration of the Ice Witch:__**\nYou can register with your damage for the Ice Witch in the "Boss Timer" channel. Double registration is possible if you want to come with 2 chars.\n\n**__Use of the points:__**\nPayment of the guild fee\nExchange for relics\n\n**__Use of the Yang:__**\nGuild space rental\nGuild NPC\nUpcoming guild updates\nGuild equipment (e.g. EXP belts)\n\nIf you have any questions, please do not hesitate to contact us.\nHave fun and success in our guild!`,
					});
				}
				else if (newRoles.has(process.env.PORTUGUESE_ROLE_ID)) {
					newMember.send({
						content: `Olá <@${newMember.id}>,\nBem-vindo/a à nossa guild! Estamos felizes por te receber na nossa guild.\n\nGostaríamos de te informar sobre o nosso sistema interno de guild e apresentar-te as funções de algumas salas do Discord.\n\n**__Contribuição para a guild:__**\nCada membro paga uma contribuição semanal de 25 pontos, que servem como moeda interna e são utilizados para diversos propósitos dentro da guild. Se não tiveres pontos suficientes, a diferença será compensada com Yang.\n\n**__Obtenção dos pontos:__**\nParticipação bem-sucedida na Ice Witch: 5 pontos (Apenas utilizadores registados recebem os respetivos pontos)\nAtividades PvP bem-sucedidas na Ice Witch: 2 pontos (apenas utilizadores registados recebem os respetivos pontos)\nEntrega de relíquias: 1 ponto\nDoações de 1kk Yang para a guild: 1 ponto\nContribuição através de guias, traduções e tabelas: O número de pontos varia dependendo da quantidade e qualidade do trabalho.\n\n**__Registo na Ice Witch:__**\nPodes registar-te com o teu dano para a Ice Witch na sala "Boss Timer". Podes registar-te 2 vezes se quiseres vir com 2 personagens.\n\n**__Utilização dos pontos:__**\nPagamento da taxa da guild\nTroca por relíquias\n\n**__Utilização do Yang:__**\nAluguer de espaço da guild\nNPC da guild\nPróximas atualizações da guild\nEquipamento da guild (por exemplo, cintos de EXP)\n\nSe tiveres alguma questão, por favor não hesites em contactar-nos.\nDiverte-te e tem sucesso na nossa guild!`,
					});
				}
				else if (newRoles.has(process.env.GREEK_ROLE_ID)) {
					newMember.send({
						content: `Γειά σου <@${newMember.id}>\nΚαλώς ήρθες στην συντεχνία μας! Είμαστε χαρούμενοι να σε καλωσορίσουμε στην ομάδα μας.\n\nΘα θέλαμε να σε ενημερώσουμε για το εσωτερικό σύστημα της ομάδας μας και να σε δείξουμε τις λειτουργίες των καναλιών μας στο discord.\n\n**__Εισφορές ομάδας:__**\nΚάθε μέλος πληρώνει κάθε εβδομάδα μια εισφορά των 25 πόντων, το οποίο είναι το εσωτερικό νόμισμα τα οποία τα χρησιμοποιείς για διάφορα πράγματα εντός της ομάδας.\nΕάν δεν έχεις αρκετούς πόντους , η διαφορά που θα έχεις από τους πόντους θα την ξεπληρώσεις με Yang.\n\n**__Πώς κερδίζεις πόντους:__**\nΟλοκληρωμένη και πετυχημένη συμμετοχή στην Μάγισσα των Πάγων: 5 πόντοι ( μόνο όσοι έχουν κάνει εγγραφή παίρνουν πόντους).\nΕπιτυχημένες PVP δραστηριότητες στη Μάγισσα των Πάγων: 2 πόντοι ( μόνο όσοι έχουν κάνει εγγραφή παίρνουν πόντους).\nΔωρεά relics από πέτρες : 1 πόντος.\nΔωρεές από 1kk στην ομάδα : 1 πόντος.\nΣυνεισφορά όσο αναφορά οδηγούς για το παιχνίδι,μεταφράσεις και διάφορα άλλα που έχουμε φτιάξει(υπολογισμός Yang από metins κτλπ): Η ποσότητα των πόντων ποικίλουν ανάλογα από την ποσότητα και την ποιότητα της δουλειάς σου.\n\n**__Εγγραφή για την Μάγισσα των Πάγων:__**\nΜπορείς να κάνεις εγγραφή με το DMG το οποίο κανείς στην Μάγισσα των Πάγων στο κανάλι " Χρονοδιακόπτης Αρχηγών". Η διπλή εγγραφή είναι αποδεκτή εάν θέλεις να έρθεις με 2 παίχτες.\n\n**__Χρήση των Πόντων:__**\nΠληρωμή των εβδομαδιαίων φόρων στην ομάδα.\nΑνταλλαγή για relics πετρών+5\n\n**__Χρήση Yang:__**\nΠληρωμή ενοικίου της ομάδας για τον χώρο της.\nΠληρωμή για τον φύλακα χωραφιού της ομάδας.\nΑπερχόμενες ομαδικές αναβαθμίσεις.\nΕξοπλισμό για την ομάδα ( π.χ ζώνες για. ΕΧP κτλπ.)\n\nΕάν έχετε κάποια απορία-ερώτηση, μην διστάσετε να μας επικοινωνήσετε μαζί μας.\n\nΚαλή διασκέδαση!!\nΚαλή διαμονή στην ομάδα μας!`,
					});
				}
				else if (newRoles.has(process.env.ROMANIAN_ROLE_ID)) {
					newMember.send({
						content: `Salut <@${newMember.id}>,\nbun venit in breasla noastra! Suntem fericiti sa te primim in breasla noastra.\n\nNoi am vrea sa te informam despre sistemul intern al breslei si sa te informam despre functile a unor canale de discord.\n\n**__Contributia breslei:__**\nFiecare membru plateste o contributie saptamanala a 25 de puncte, care este moneda interna si este folosita pentru diverse scopuri in breasla. Daca nu ai destule puncte, diferenta se va plati cu yang.\n\n**__Adunarea punctelor:__**\nParticiparea la Vrajitoarea de Gheata: 5 puncte (Doar userii registrati o sa-si primeasca punctele)\nParticiparea la activitati PvP la Vrajitoarea de Gheata: 2 puncte (Doar userii inregistrati o sa-si primeasca punctele)\nPredarea relicvelor: 1 punct\nDonatiile de 1kk Yang la breasla: 1 punct\nContributia pentru ghiduri, traducere si tabele: Numarul poate varia, depinde de cantitate si calitate a muncii.\n\n**__Inregistrarea pentru Vrajitoarea de Gheata:__**\nTe poti inregistra cu daunele tale pentru Vrajitorea de Gheata in canalul "Boss Timer". Inregistrarea dubla este posibila daca vrei sa vi cu 2 conturi.\n\n**__Folosirea punctelor:__**\nPlatirea taxelor breslei\nPentru cumpararea relicvelor\n\n**__Folosirea yang-ului:__**\nIntretinerea spatiului breslei\nNPC-uri ale breslei\nUrmatoarele update-uri ale breslei\nEchipamentul breslei (exemplu Curea de experienta)\n\nDaca aj orice intrebare, te rog sa nu eziti sa ne contactati.\nDistractie placuta si succes in breasla noastra! `,
					});
				}
			}
			catch (e) {
				console.log('31' + e);
			}
		}
	},
};