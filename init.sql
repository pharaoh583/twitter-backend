create database if not exists twitter;
use twitter;

create table if not exists user(
	userId int not null auto_increment primary key,
	username varchar(40)
);

create table if not exists tweets(
	tweet_id int not null auto_increment primary key,
	user_sender_id int not null,
	text varchar(200),
	foreign key (user_sender_id) references user(userId)
);

create table if not exists follows(
	user_follower_id int not null,
	user_followed_id int not null,
	foreign key (user_follower_id) references user(userId),
	foreign key (user_followed_id) references user(userId)
);
